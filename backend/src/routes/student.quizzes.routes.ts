import { Router } from "express";
import { AttemptStatus, QuizStatus, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { requireStudentProfileId } from "../utils/context";
import { syncQuizStatuses } from "../lib/quizStatus";

const router = Router();
router.use(authenticate, requireRole(Role.STUDENT));

const quizCardInclude = {
  subject: true,
  class: true,
  teacher: { include: { user: true } },
  _count: { select: { questions: true } },
} as const;

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.sub } });
    if (!student) throw new HttpError(403, "No student profile is associated with this account");
    if (!student.classId) {
      res.json({ available: [], upcoming: [], completed: [] });
      return;
    }

    const rawQuizzes = await prisma.quiz.findMany({
      where: { classId: student.classId, status: { in: [QuizStatus.SCHEDULED, QuizStatus.ACTIVE, QuizStatus.CLOSED] } },
      include: quizCardInclude,
      orderBy: { opensAt: "asc" },
    });
    const quizzes = await syncQuizStatuses(rawQuizzes);

    const attempts = await prisma.quizAttempt.findMany({
      where: { studentId: student.id, quizId: { in: quizzes.map((q) => q.id) } },
    });
    const attemptsByQuiz = new Map<string, typeof attempts>();
    for (const a of attempts) {
      const list = attemptsByQuiz.get(a.quizId) ?? [];
      list.push(a);
      attemptsByQuiz.set(a.quizId, list);
    }

    const available: any[] = [];
    const upcoming: any[] = [];
    const completed: any[] = [];

    for (const quiz of quizzes) {
      const quizAttempts = attemptsByQuiz.get(quiz.id) ?? [];
      const submitted = quizAttempts.filter((a) => a.status !== AttemptStatus.IN_PROGRESS);
      const inProgress = quizAttempts.find((a) => a.status === AttemptStatus.IN_PROGRESS);
      const bestPercentage = submitted.length ? Math.max(...submitted.map((a) => a.percentage ?? 0)) : null;

      const card = {
        ...quiz,
        attemptsUsed: submitted.length,
        hasInProgressAttempt: !!inProgress,
        bestPercentage,
        lastAttemptId: submitted[submitted.length - 1]?.id ?? null,
      };

      if (submitted.length > 0 && submitted.length >= quiz.maxAttempts) {
        completed.push(card);
      } else if (quiz.status === QuizStatus.ACTIVE) {
        available.push(card);
      } else if (quiz.status === QuizStatus.SCHEDULED) {
        upcoming.push(card);
      } else if (submitted.length > 0) {
        completed.push(card);
      }
    }

    res.json({ available, upcoming, completed });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const studentId = await requireStudentProfileId(req);
    const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });

    const quiz = await prisma.quiz.findFirst({
      where: { id: req.params.id, classId: student!.classId ?? undefined },
      include: quizCardInclude,
    });
    if (!quiz) throw new HttpError(404, "Quiz not found");

    const attempts = await prisma.quizAttempt.findMany({ where: { quizId: quiz.id, studentId } });

    res.json({
      data: {
        ...quiz,
        attemptsUsed: attempts.filter((a) => a.status !== AttemptStatus.IN_PROGRESS).length,
        hasInProgressAttempt: attempts.some((a) => a.status === AttemptStatus.IN_PROGRESS),
      },
    });
  })
);

export default router;
