import { Router } from "express";
import { z } from "zod";
import { AttemptStatus, NotificationType, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { requireTeacherProfileId } from "../utils/context";
import { paginationMeta, paginationSchema } from "../utils/pagination";
import { notify } from "../lib/notify";
import { recordAudit } from "../lib/audit";
import { toCsv } from "../utils/csv";
import { safeUserSelect } from "../utils/safeSelects";

const router = Router();
router.use(authenticate, requireRole(Role.TEACHER));

const listQuerySchema = paginationSchema.extend({
  quizId: z.string().optional(),
  classId: z.string().optional(),
  studentId: z.string().optional(),
});

router.get(
  "/",
  validateQuery(listQuerySchema),
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const { page, pageSize, quizId, classId, studentId } = req.query as unknown as z.infer<typeof listQuerySchema>;

    const where: any = {
      status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED] },
      quiz: { teacherId, ...(classId ? { classId } : {}) },
      ...(quizId ? { quizId } : {}),
      ...(studentId ? { studentId } : {}),
    };

    const [total, attempts] = await Promise.all([
      prisma.quizAttempt.count({ where }),
      prisma.quizAttempt.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          quiz: { select: { title: true, subject: true, class: true, passingScore: true } },
          student: { include: { user: { select: { name: true } }, class: true } },
        },
      }),
    ]);

    res.json({ data: attempts, meta: paginationMeta(total, page, pageSize) });
  })
);

const exportQuerySchema = z.object({ quizId: z.string().optional(), classId: z.string().optional() });

router.get(
  "/export.csv",
  validateQuery(exportQuerySchema),
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const { quizId, classId } = req.query as unknown as z.infer<typeof exportQuerySchema>;

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED] },
        quiz: { teacherId, ...(classId ? { classId } : {}) },
        ...(quizId ? { quizId } : {}),
      },
      orderBy: { submittedAt: "desc" },
      include: {
        quiz: { include: { subject: true, class: true } },
        student: { include: { user: { select: safeUserSelect }, class: true } },
      },
    });

    const csv = toCsv(
      attempts.map((a) => ({
        student: a.student.user.name,
        studentCode: a.student.studentCode,
        class: a.quiz.class.name,
        quiz: a.quiz.title,
        subject: a.quiz.subject.name,
        score: a.score,
        totalMarks: a.totalMarks,
        percentage: a.percentage?.toFixed(1),
        grade: a.grade,
        attemptNumber: a.attemptNumber,
        submittedAt: a.submittedAt?.toISOString(),
      })),
      [
        { key: "student", header: "Student" },
        { key: "studentCode", header: "Student ID" },
        { key: "class", header: "Class" },
        { key: "quiz", header: "Quiz" },
        { key: "subject", header: "Subject" },
        { key: "score", header: "Score" },
        { key: "totalMarks", header: "Total Marks" },
        { key: "percentage", header: "Percentage" },
        { key: "grade", header: "Grade" },
        { key: "attemptNumber", header: "Attempt #" },
        { key: "submittedAt", header: "Submitted At" },
      ]
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="results-export.csv"`);
    res.send(csv);
  })
);

router.get(
  "/:attemptId",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: req.params.attemptId, quiz: { teacherId } },
      include: {
        quiz: { include: { subject: true, class: true } },
        student: { include: { user: { select: safeUserSelect }, class: true } },
        answers: { include: { question: { include: { options: true } } } },
      },
    });
    if (!attempt) throw new HttpError(404, "Result not found");
    res.json({ data: attempt });
  })
);

const feedbackSchema = z.object({ teacherFeedback: z.string().min(1).max(2000) });

router.patch(
  "/:attemptId/feedback",
  validateBody(feedbackSchema),
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: req.params.attemptId, quiz: { teacherId } },
      include: { quiz: true, student: { include: { user: { select: safeUserSelect } } } },
    });
    if (!attempt) throw new HttpError(404, "Result not found");

    const updated = await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: { teacherFeedback: req.body.teacherFeedback },
    });

    await notify({
      userId: attempt.student.user.id,
      type: NotificationType.FEEDBACK,
      title: "New feedback from your teacher",
      message: `Your teacher left feedback on "${attempt.quiz.title}".`,
    });

    await recordAudit({ actorId: req.user!.sub, action: "FEEDBACK_ADDED", entityType: "QuizAttempt", entityId: attempt.id, req });

    res.json({ data: updated });
  })
);

export default router;
