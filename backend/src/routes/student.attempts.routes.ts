import { Router } from "express";
import { z } from "zod";
import { AttemptStatus, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { requireStudentProfileId } from "../utils/context";
import {
  startAttempt,
  getActiveAttempt,
  loadAttemptForStudent,
  buildQuestionPayload,
  saveAnswer,
  submitAttempt,
  recordTabSwitch,
} from "../lib/attemptEngine";

const router = Router();
router.use(authenticate, requireRole(Role.STUDENT));

async function serializeAttempt(attemptId: string) {
  const attempt = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: {
      quiz: { include: { questions: { include: { question: { include: { options: true } } } }, subject: true, class: true } },
      answers: true,
    },
  });

  const remainingSeconds = Math.max(0, Math.round((attempt.deadlineAt.getTime() - Date.now()) / 1000));

  if (attempt.status === AttemptStatus.IN_PROGRESS) {
    const questions = await buildQuestionPayload(attempt.quiz, attempt.questionOrder as any, attempt.answers as any);
    return {
      id: attempt.id,
      status: attempt.status,
      quizId: attempt.quizId,
      quizTitle: attempt.quiz.title,
      subject: attempt.quiz.subject.name,
      instructions: attempt.quiz.instructions,
      startedAt: attempt.startedAt,
      deadlineAt: attempt.deadlineAt,
      remainingSeconds,
      totalQuestions: questions.length,
      answeredCount: attempt.answers.filter((a) => a.selectedOptionIds.length > 0 || (a.textAnswer && a.textAnswer.trim())).length,
      questions,
    };
  }

  const answerMap = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const questionOrder = attempt.questionOrder as unknown as { questionId: string; optionOrder: string[] }[];
  const detailed = attempt.quiz.showCorrectAnswers
    ? questionOrder.map((entry, index) => {
        const qq = attempt.quiz.questions.find((q) => q.questionId === entry.questionId)!;
        const answer = answerMap.get(entry.questionId);
        return {
          questionNumber: index + 1,
          text: qq.question.text,
          type: qq.question.type,
          marks: qq.marksOverride ?? qq.question.marks,
          marksAwarded: answer?.marksAwarded ?? 0,
          selectedOptionIds: answer?.selectedOptionIds ?? [],
          textAnswer: answer?.textAnswer ?? null,
          isCorrect: answer?.isCorrect ?? false,
          needsReview: answer?.needsReview ?? false,
          feedback: attempt.quiz.showExplanations ? (answer?.teacherNote ?? answer?.aiSuggestedFeedback ?? null) : null,
          explanation: attempt.quiz.showExplanations ? qq.question.explanation : null,
          options: entry.optionOrder.map((optId) => {
            const opt = qq.question.options.find((o) => o.id === optId)!;
            return { id: opt.id, text: opt.text, isCorrect: opt.isCorrect };
          }),
        };
      })
    : null;

  return {
    id: attempt.id,
    status: attempt.status,
    quizId: attempt.quizId,
    quizTitle: attempt.quiz.title,
    subject: attempt.quiz.subject.name,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    score: attempt.quiz.showResultsImmediately ? attempt.score : null,
    totalMarks: attempt.quiz.showResultsImmediately ? attempt.totalMarks : null,
    percentage: attempt.quiz.showResultsImmediately ? attempt.percentage : null,
    grade: attempt.quiz.showResultsImmediately ? attempt.grade : null,
    passed: attempt.quiz.showResultsImmediately ? (attempt.percentage ?? 0) >= attempt.quiz.passingScore : null,
    resultsWithheld: !attempt.quiz.showResultsImmediately,
    teacherFeedback: attempt.teacherFeedback,
    tabSwitchCount: attempt.tabSwitchCount,
    questions: detailed,
  };
}

const startSchema = z.object({ quizId: z.string() });

router.post(
  "/",
  validateBody(startSchema),
  asyncHandler(async (req, res) => {
    const studentId = await requireStudentProfileId(req);
    const { attempt } = await startAttempt(studentId, req.body.quizId);
    res.status(201).json({ data: await serializeAttempt(attempt.id) });
  })
);

router.get(
  "/active",
  asyncHandler(async (req, res) => {
    const studentId = await requireStudentProfileId(req);
    const attempt = await getActiveAttempt(studentId);
    if (!attempt) {
      res.json({ data: null });
      return;
    }
    res.json({ data: await serializeAttempt(attempt.id) });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const studentId = await requireStudentProfileId(req);
    await loadAttemptForStudent(req.params.id, studentId);
    res.json({ data: await serializeAttempt(req.params.id) });
  })
);

const answerSchema = z.object({
  questionId: z.string(),
  selectedOptionIds: z.array(z.string()).optional(),
  textAnswer: z.string().max(5000).optional(),
});

router.post(
  "/:id/answers",
  validateBody(answerSchema),
  asyncHandler(async (req, res) => {
    const studentId = await requireStudentProfileId(req);
    await saveAnswer(req.params.id, studentId, req.body.questionId, {
      selectedOptionIds: req.body.selectedOptionIds,
      textAnswer: req.body.textAnswer,
    });
    res.json({ data: await serializeAttempt(req.params.id) });
  })
);

router.post(
  "/:id/tab-switch",
  asyncHandler(async (req, res) => {
    const studentId = await requireStudentProfileId(req);
    const attempt = await recordTabSwitch(req.params.id, studentId);
    res.json({ data: { tabSwitchCount: attempt.tabSwitchCount } });
  })
);

const submitSchema = z.object({ tabSwitchCount: z.number().int().min(0).optional() });

router.post(
  "/:id/submit",
  validateBody(submitSchema),
  asyncHandler(async (req, res) => {
    const studentId = await requireStudentProfileId(req);
    await submitAttempt(req.params.id, studentId, req.body);
    res.json({ data: await serializeAttempt(req.params.id) });
  })
);

export default router;
