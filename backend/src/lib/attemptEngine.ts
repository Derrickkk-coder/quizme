import { AttemptStatus, NotificationType, QuestionType, QuizStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { HttpError } from "../middleware/errorHandler";
import { computeEffectiveStatus } from "./quizStatus";
import { gradeForPercent } from "./grade";
import { gradeShortAnswers } from "./gemini";
import { notify } from "./notify";
import { recordAudit } from "./audit";
import { safeUserSelect } from "../utils/safeSelects";

const quizWithQuestions = {
  questions: { include: { question: { include: { options: true } } } },
  subject: true,
  class: true,
  teacher: { include: { user: { select: safeUserSelect } } },
} as const;

type QuestionOrderEntry = { questionId: string; optionOrder: string[] };

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function startAttempt(studentId: string, quizId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: quizWithQuestions });
  if (!quiz) throw new HttpError(404, "Quiz not found");

  const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
  if (!student || student.classId !== quiz.classId) {
    throw new HttpError(403, "This quiz is not assigned to your class");
  }

  const effective = computeEffectiveStatus(quiz);
  if (effective === QuizStatus.DRAFT) throw new HttpError(400, "This quiz has not been published yet");
  if (effective === QuizStatus.SCHEDULED) throw new HttpError(400, "This quiz has not opened yet");
  if (effective === QuizStatus.CLOSED) throw new HttpError(400, "This quiz is closed");

  if (quiz.questions.length === 0) throw new HttpError(400, "This quiz has no questions yet");

  // Prevent multiple simultaneous quiz sessions across any quiz.
  const otherInProgress = await prisma.quizAttempt.findFirst({
    where: { studentId, status: AttemptStatus.IN_PROGRESS, quizId: { not: quizId } },
  });
  if (otherInProgress) {
    const resolved = await autoSubmitIfExpired(otherInProgress.id);
    if (resolved.status === AttemptStatus.IN_PROGRESS) {
      throw new HttpError(409, "You already have another quiz in progress. Finish or submit it first.");
    }
  }

  const existingForQuiz = await prisma.quizAttempt.findMany({ where: { studentId, quizId }, orderBy: { attemptNumber: "desc" } });
  const inProgress = existingForQuiz.find((a) => a.status === AttemptStatus.IN_PROGRESS);
  if (inProgress) {
    const resolved = await autoSubmitIfExpired(inProgress.id);
    if (resolved.status === AttemptStatus.IN_PROGRESS) {
      return { attempt: resolved, quiz, resumed: true };
    }
  }

  const submittedCount = existingForQuiz.filter((a) => a.status !== AttemptStatus.IN_PROGRESS).length;
  if (submittedCount >= quiz.maxAttempts) {
    throw new HttpError(400, "You have used all available attempts for this quiz");
  }

  const orderedQuestions = quiz.randomizeQuestions ? shuffle(quiz.questions) : [...quiz.questions].sort((a, b) => a.order - b.order);
  const questionOrder: QuestionOrderEntry[] = orderedQuestions.map((qq) => {
    const sortedOptions = [...qq.question.options].sort((a, b) => a.order - b.order);
    const orderedOptions = quiz.randomizeOptions ? shuffle(sortedOptions) : sortedOptions;
    return { questionId: qq.questionId, optionOrder: orderedOptions.map((o) => o.id) };
  });

  const deadlineAt = new Date(Date.now() + quiz.durationMinutes * 60 * 1000);

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      studentId,
      attemptNumber: submittedCount + 1,
      deadlineAt,
      status: AttemptStatus.IN_PROGRESS,
      questionOrder: questionOrder as any,
    },
  });

  await recordAudit({ actorId: student.userId, action: "QUIZ_ATTEMPT_STARTED", entityType: "QuizAttempt", entityId: attempt.id });

  return { attempt, quiz, resumed: false };
}

export async function getActiveAttempt(studentId: string) {
  const attempt = await prisma.quizAttempt.findFirst({
    where: { studentId, status: AttemptStatus.IN_PROGRESS },
    orderBy: { startedAt: "desc" },
  });
  if (!attempt) return null;
  return autoSubmitIfExpired(attempt.id);
}

export async function loadAttemptForStudent(attemptId: string, studentId: string) {
  const attempt = await prisma.quizAttempt.findFirst({ where: { id: attemptId, studentId } });
  if (!attempt) throw new HttpError(404, "Attempt not found");
  if (attempt.status === AttemptStatus.IN_PROGRESS) {
    return autoSubmitIfExpired(attempt.id);
  }
  return attempt;
}

export async function buildQuestionPayload(
  quiz: { questions: any[] },
  questionOrder: QuestionOrderEntry[],
  savedAnswers: { questionId: string; selectedOptionIds: string[]; textAnswer?: string | null }[]
) {
  const questionMap = new Map(quiz.questions.map((qq: any) => [qq.questionId as string, qq]));
  const answerMap = new Map(savedAnswers.map((a) => [a.questionId, a]));

  return questionOrder.map((entry, index) => {
    const qq = questionMap.get(entry.questionId);
    const optionMap = new Map(qq.question.options.map((o: any) => [o.id, o]));
    const answer = answerMap.get(entry.questionId);
    return {
      questionNumber: index + 1,
      questionId: entry.questionId,
      text: qq.question.text,
      type: qq.question.type,
      marks: qq.marksOverride ?? qq.question.marks,
      options: entry.optionOrder.map((optId) => {
        const opt: any = optionMap.get(optId);
        return { id: opt.id, text: opt.text };
      }),
      selectedOptionIds: answer?.selectedOptionIds ?? [],
      textAnswer: answer?.textAnswer ?? "",
    };
  });
}

export async function saveAnswer(
  attemptId: string,
  studentId: string,
  questionId: string,
  input: { selectedOptionIds?: string[]; textAnswer?: string }
) {
  const attempt = await loadAttemptForStudent(attemptId, studentId);
  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    throw new HttpError(400, "This attempt has already been submitted");
  }

  const questionOrder = attempt.questionOrder as unknown as QuestionOrderEntry[];
  const entry = questionOrder.find((q) => q.questionId === questionId);
  if (!entry) throw new HttpError(400, "This question is not part of the current attempt");

  const question = await prisma.question.findUniqueOrThrow({ where: { id: questionId }, select: { type: true } });

  if (question.type === QuestionType.SHORT_ANSWER) {
    const textAnswer = (input.textAnswer ?? "").slice(0, 5000);
    const answer = await prisma.answer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      update: { textAnswer },
      create: { attemptId, questionId, textAnswer },
    });
    return answer;
  }

  const selectedOptionIds = input.selectedOptionIds ?? [];
  if (selectedOptionIds.some((id) => !entry.optionOrder.includes(id))) {
    throw new HttpError(400, "Invalid option for this question");
  }
  if (question.type === "SINGLE_CHOICE" && selectedOptionIds.length > 1) {
    throw new HttpError(400, "This question only allows one selected answer");
  }

  const answer = await prisma.answer.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    update: { selectedOptionIds },
    create: { attemptId, questionId, selectedOptionIds },
  });

  return answer;
}

export async function recordTabSwitch(attemptId: string, studentId: string) {
  const attempt = await loadAttemptForStudent(attemptId, studentId);
  if (attempt.status !== AttemptStatus.IN_PROGRESS) return attempt;
  return prisma.quizAttempt.update({ where: { id: attemptId }, data: { tabSwitchCount: { increment: 1 } } });
}

export async function submitAttempt(attemptId: string, studentId: string, opts: { tabSwitchCount?: number } = {}) {
  const attempt = await prisma.quizAttempt.findFirst({ where: { id: attemptId, studentId } });
  if (!attempt) throw new HttpError(404, "Attempt not found");
  if (attempt.status !== AttemptStatus.IN_PROGRESS) return attempt;

  return finalizeAttempt(attempt.id, false, opts.tabSwitchCount);
}

export async function autoSubmitIfExpired(attemptId: string) {
  const attempt = await prisma.quizAttempt.findUniqueOrThrow({ where: { id: attemptId } });
  if (attempt.status !== AttemptStatus.IN_PROGRESS) return attempt;
  if (new Date() < attempt.deadlineAt) return attempt;
  return finalizeAttempt(attempt.id, true);
}

async function finalizeAttempt(attemptId: string, auto: boolean, tabSwitchCount?: number) {
  const attempt = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: {
      quiz: { include: { questions: { include: { question: { include: { options: true } } } }, teacher: { include: { user: { select: safeUserSelect } } } } },
      student: { include: { user: { select: safeUserSelect } } },
      answers: true,
    },
  });

  const questionsByid = new Map(attempt.quiz.questions.map((qq) => [qq.questionId, qq]));
  let score = 0;
  let totalMarks = 0;

  for (const qq of attempt.quiz.questions) {
    totalMarks += qq.marksOverride ?? qq.question.marks;
  }

  const mcqAnswers = attempt.answers.filter((a) => questionsByid.get(a.questionId)?.question.type !== QuestionType.SHORT_ANSWER);
  const shortAnswers = attempt.answers.filter((a) => questionsByid.get(a.questionId)?.question.type === QuestionType.SHORT_ANSWER);

  await prisma.$transaction(
    mcqAnswers.map((answer) => {
      const qq = questionsByid.get(answer.questionId);
      const correctOptionIds = new Set((qq?.question.options ?? []).filter((o) => o.isCorrect).map((o) => o.id));
      const selected = new Set(answer.selectedOptionIds);
      const isCorrect =
        selected.size > 0 &&
        selected.size === correctOptionIds.size &&
        [...selected].every((id) => correctOptionIds.has(id));
      const marksAwarded = isCorrect ? qq?.marksOverride ?? qq?.question.marks ?? 0 : 0;
      if (isCorrect) score += marksAwarded;
      return prisma.answer.update({ where: { id: answer.id }, data: { isCorrect, marksAwarded } });
    })
  );

  // Short-answer questions get an initial AI grading pass so a provisional
  // score is available immediately; the teacher reviews/overrides afterward.
  // A blank answer gets 0 marks with nothing to review.
  let hasPendingReview = false;
  const answeredShortAnswers = shortAnswers.filter((a) => a.textAnswer && a.textAnswer.trim());
  const blankShortAnswers = shortAnswers.filter((a) => !(a.textAnswer && a.textAnswer.trim()));

  if (blankShortAnswers.length > 0) {
    await prisma.$transaction(
      blankShortAnswers.map((answer) =>
        prisma.answer.update({ where: { id: answer.id }, data: { marksAwarded: 0, isCorrect: false, needsReview: false } })
      )
    );
  }

  if (answeredShortAnswers.length > 0) {
    const gradingItems = answeredShortAnswers.map((answer) => {
      const qq = questionsByid.get(answer.questionId)!;
      return {
        questionId: answer.questionId,
        questionText: qq.question.text,
        modelAnswer: qq.question.modelAnswer,
        marks: qq.marksOverride ?? qq.question.marks,
        studentAnswer: answer.textAnswer!,
      };
    });

    try {
      const aiGrades = await gradeShortAnswers(gradingItems);
      const aiGradeMap = new Map(aiGrades.map((g) => [g.questionId, g]));

      await prisma.$transaction(
        answeredShortAnswers.map((answer) => {
          const qq = questionsByid.get(answer.questionId)!;
          const maxMarks = qq.marksOverride ?? qq.question.marks;
          const aiGrade = aiGradeMap.get(answer.questionId);
          const marksAwarded = aiGrade ? Math.max(0, Math.min(maxMarks, aiGrade.marksAwarded)) : 0;
          score += marksAwarded;
          return prisma.answer.update({
            where: { id: answer.id },
            data: {
              marksAwarded,
              aiSuggestedMarks: aiGrade ? marksAwarded : null,
              aiSuggestedFeedback: aiGrade?.feedback ?? null,
              needsReview: true,
            },
          });
        })
      );
      hasPendingReview = true;
    } catch (err) {
      console.error("Short-answer AI grading failed, falling back to manual review:", err);
      await prisma.$transaction(
        answeredShortAnswers.map((answer) =>
          prisma.answer.update({ where: { id: answer.id }, data: { marksAwarded: 0, needsReview: true } })
        )
      );
      hasPendingReview = true;
    }
  }

  const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
  const grade = await gradeForPercent(percentage);

  const updated = await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      status: auto ? AttemptStatus.AUTO_SUBMITTED : AttemptStatus.SUBMITTED,
      submittedAt: new Date(),
      score,
      totalMarks,
      percentage,
      grade,
      hasPendingReview,
      ...(tabSwitchCount !== undefined ? { tabSwitchCount } : {}),
    },
  });

  if (attempt.quiz.showResultsImmediately) {
    await notify({
      userId: attempt.student.user.id,
      type: NotificationType.RESULT_AVAILABLE,
      title: "Result available",
      message: `Your result for "${attempt.quiz.title}" is ready: ${Math.round(percentage)}% (${grade}).`,
    });
  }

  await notify({
    userId: attempt.quiz.teacher.user.id,
    type: NotificationType.SUBMISSION,
    title: "Quiz submitted",
    message: `${attempt.student.user.name} submitted "${attempt.quiz.title}".`,
  });

  await recordAudit({
    actorId: attempt.student.user.id,
    action: auto ? "QUIZ_ATTEMPT_AUTO_SUBMITTED" : "QUIZ_ATTEMPT_SUBMITTED",
    entityType: "QuizAttempt",
    entityId: attempt.id,
    metadata: { score, totalMarks, percentage },
  });

  return updated;
}
