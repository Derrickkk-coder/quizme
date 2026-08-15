import { AttemptStatus, NotificationType, QuizStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { HttpError } from "../middleware/errorHandler";
import { computeEffectiveStatus } from "./quizStatus";
import { gradeForPercent } from "./grade";
import { notify } from "./notify";
import { recordAudit } from "./audit";

const quizWithQuestions = {
  questions: { include: { question: { include: { options: true } } } },
  subject: true,
  class: true,
  teacher: { include: { user: true } },
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

export async function buildQuestionPayload(quiz: { questions: any[] }, questionOrder: QuestionOrderEntry[], savedAnswers: { questionId: string; selectedOptionId: string | null }[]) {
  const questionMap = new Map(quiz.questions.map((qq: any) => [qq.questionId as string, qq]));
  const answerMap = new Map(savedAnswers.map((a) => [a.questionId, a.selectedOptionId]));

  return questionOrder.map((entry, index) => {
    const qq = questionMap.get(entry.questionId);
    const optionMap = new Map(qq.question.options.map((o: any) => [o.id, o]));
    return {
      questionNumber: index + 1,
      questionId: entry.questionId,
      text: qq.question.text,
      marks: qq.marksOverride ?? qq.question.marks,
      options: entry.optionOrder.map((optId) => {
        const opt: any = optionMap.get(optId);
        return { id: opt.id, text: opt.text };
      }),
      selectedOptionId: answerMap.get(entry.questionId) ?? null,
    };
  });
}

export async function saveAnswer(attemptId: string, studentId: string, questionId: string, selectedOptionId: string | null) {
  const attempt = await loadAttemptForStudent(attemptId, studentId);
  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    throw new HttpError(400, "This attempt has already been submitted");
  }

  const questionOrder = attempt.questionOrder as unknown as QuestionOrderEntry[];
  const entry = questionOrder.find((q) => q.questionId === questionId);
  if (!entry) throw new HttpError(400, "This question is not part of the current attempt");
  if (selectedOptionId && !entry.optionOrder.includes(selectedOptionId)) {
    throw new HttpError(400, "Invalid option for this question");
  }

  const answer = await prisma.answer.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    update: { selectedOptionId },
    create: { attemptId, questionId, selectedOptionId },
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
      quiz: { include: { questions: { include: { question: { include: { options: true } } } }, teacher: { include: { user: true } } } },
      student: { include: { user: true } },
      answers: true,
    },
  });

  const questionsByid = new Map(attempt.quiz.questions.map((qq) => [qq.questionId, qq]));
  let score = 0;
  let totalMarks = 0;

  for (const qq of attempt.quiz.questions) {
    totalMarks += qq.marksOverride ?? qq.question.marks;
  }

  await prisma.$transaction(
    attempt.answers.map((answer) => {
      const qq = questionsByid.get(answer.questionId);
      const correctOption = qq?.question.options.find((o) => o.isCorrect);
      const isCorrect = !!answer.selectedOptionId && !!correctOption && answer.selectedOptionId === correctOption.id;
      const marksAwarded = isCorrect ? qq?.marksOverride ?? qq?.question.marks ?? 0 : 0;
      if (isCorrect) score += marksAwarded;
      return prisma.answer.update({ where: { id: answer.id }, data: { isCorrect, marksAwarded } });
    })
  );

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
