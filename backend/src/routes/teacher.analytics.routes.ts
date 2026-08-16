import { Router } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { requireTeacherProfileId } from "../utils/context";
import { computeQuizAnalytics, computeStudentPerformance } from "../lib/performance";
import { HttpError } from "../middleware/errorHandler";

const router = Router();
router.use(authenticate, requireRole(Role.TEACHER));

router.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    // "Classes taught" reflects classes this teacher has actually posted quizzes
    // to, not assignment config — any teacher can post to any class.
    const [quizCount, questionCount, classCount, attemptCount] = await Promise.all([
      prisma.quiz.count({ where: { teacherId } }),
      prisma.question.count({ where: { teacherId } }),
      prisma.quiz.findMany({ where: { teacherId }, distinct: ["classId"], select: { classId: true } }).then((r) => r.length),
      prisma.quizAttempt.count({ where: { quiz: { teacherId } } }),
    ]);
    res.json({ data: { quizCount, questionCount, classCount, attemptCount } });
  })
);

router.get(
  "/quiz/:quizId",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const data = await computeQuizAnalytics(req.params.quizId, teacherId);
    res.json({ data });
  })
);

router.get(
  "/student/:studentId",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const student = await prisma.studentProfile.findUnique({ where: { id: req.params.studentId } });
    if (!student) throw new HttpError(404, "Student not found");
    const data = await computeStudentPerformance(req.params.studentId, teacherId);
    res.json({ data });
  })
);

export default router;
