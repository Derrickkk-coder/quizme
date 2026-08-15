import { Router } from "express";
import { Role, AttemptStatus, QuizStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();
router.use(authenticate, requireRole(Role.ADMIN));

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [totalStudents, totalTeachers, totalClasses, totalSubjects, totalQuizzes, activeQuizzes, closedQuizzes] =
      await Promise.all([
        prisma.user.count({ where: { role: Role.STUDENT } }),
        prisma.user.count({ where: { role: Role.TEACHER } }),
        prisma.class.count(),
        prisma.subject.count(),
        prisma.quiz.count(),
        prisma.quiz.count({ where: { status: QuizStatus.ACTIVE } }),
        prisma.quiz.count({ where: { status: QuizStatus.CLOSED } }),
      ]);

    const submittedAttempts = await prisma.quizAttempt.findMany({
      where: { status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED] } },
      select: {
        percentage: true,
        submittedAt: true,
        quiz: { select: { passingScore: true, subject: { select: { name: true } }, class: { select: { name: true } } } },
      },
    });

    const averageSchoolScore =
      submittedAttempts.length > 0
        ? Math.round(
            (submittedAttempts.reduce((sum, a) => sum + (a.percentage ?? 0), 0) / submittedAttempts.length) * 10
          ) / 10
        : 0;

    const passCount = submittedAttempts.filter((a) => (a.percentage ?? 0) >= a.quiz.passingScore).length;
    const overallPassRate =
      submittedAttempts.length > 0 ? Math.round((passCount / submittedAttempts.length) * 1000) / 10 : 0;

    const bySubject = new Map<string, { total: number; count: number }>();
    for (const a of submittedAttempts) {
      const key = a.quiz.subject.name;
      const entry = bySubject.get(key) ?? { total: 0, count: 0 };
      entry.total += a.percentage ?? 0;
      entry.count += 1;
      bySubject.set(key, entry);
    }
    const subjectPerformance = Array.from(bySubject.entries()).map(([subject, { total, count }]) => ({
      subject,
      averagePercentage: Math.round((total / count) * 10) / 10,
      attempts: count,
    }));

    const byClass = new Map<string, { total: number; count: number }>();
    for (const a of submittedAttempts) {
      const key = a.quiz.class.name;
      const entry = byClass.get(key) ?? { total: 0, count: 0 };
      entry.total += a.percentage ?? 0;
      entry.count += 1;
      byClass.set(key, entry);
    }
    const classPerformance = Array.from(byClass.entries()).map(([className, { total, count }]) => ({
      className,
      averagePercentage: Math.round((total / count) * 10) / 10,
      attempts: count,
    }));

    const now = new Date();
    const months: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en-US", { month: "short" }), count: 0 });
    }
    for (const a of submittedAttempts) {
      if (!a.submittedAt) continue;
      const d = a.submittedAt;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.count += 1;
    }

    res.json({
      totals: {
        totalStudents,
        totalTeachers,
        totalClasses,
        totalSubjects,
        totalQuizzes,
        activeQuizzes,
        closedQuizzes,
        averageSchoolScore,
        overallPassRate,
        totalAttempts: submittedAttempts.length,
      },
      subjectPerformance,
      classPerformance,
      monthlyActivity: months.map(({ label, count }) => ({ month: label, attempts: count })),
    });
  })
);

export default router;
