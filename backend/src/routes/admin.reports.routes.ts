import { Router } from "express";
import { z } from "zod";
import { AttemptStatus, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { toCsv } from "../utils/csv";

const router = Router();
router.use(authenticate, requireRole(Role.ADMIN));

const exportQuerySchema = z.object({
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  quizId: z.string().optional(),
});

router.get(
  "/results.csv",
  validateQuery(exportQuerySchema),
  asyncHandler(async (req, res) => {
    const { classId, subjectId, quizId } = req.query as unknown as z.infer<typeof exportQuerySchema>;

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED] },
        quiz: {
          ...(classId ? { classId } : {}),
          ...(subjectId ? { subjectId } : {}),
        },
        ...(quizId ? { quizId } : {}),
      },
      orderBy: { submittedAt: "desc" },
      include: {
        quiz: { include: { subject: true, class: true, teacher: { include: { user: true } } } },
        student: { include: { user: true } },
      },
    });

    const csv = toCsv(
      attempts.map((a) => ({
        student: a.student.user.name,
        studentCode: a.student.studentCode,
        class: a.quiz.class.name,
        quiz: a.quiz.title,
        subject: a.quiz.subject.name,
        teacher: a.quiz.teacher.user.name,
        score: a.score,
        totalMarks: a.totalMarks,
        percentage: a.percentage?.toFixed(1),
        grade: a.grade,
        submittedAt: a.submittedAt?.toISOString(),
      })),
      [
        { key: "student", header: "Student" },
        { key: "studentCode", header: "Student ID" },
        { key: "class", header: "Class" },
        { key: "quiz", header: "Quiz" },
        { key: "subject", header: "Subject" },
        { key: "teacher", header: "Teacher" },
        { key: "score", header: "Score" },
        { key: "totalMarks", header: "Total Marks" },
        { key: "percentage", header: "Percentage" },
        { key: "grade", header: "Grade" },
        { key: "submittedAt", header: "Submitted At" },
      ]
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="school-results-export.csv"`);
    res.send(csv);
  })
);

router.get(
  "/users.csv",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      include: { studentProfile: { include: { class: true } }, teacherProfile: true },
      orderBy: { createdAt: "desc" },
    });

    const csv = toCsv(
      users.map((u) => ({
        name: u.name,
        email: u.email,
        role: u.role,
        code: u.studentProfile?.studentCode ?? u.teacherProfile?.staffCode ?? "",
        class: u.studentProfile?.class?.name ?? "",
        isActive: u.isActive ? "Active" : "Inactive",
        createdAt: u.createdAt.toISOString(),
      })),
      [
        { key: "name", header: "Name" },
        { key: "email", header: "Email" },
        { key: "role", header: "Role" },
        { key: "code", header: "ID Code" },
        { key: "class", header: "Class" },
        { key: "isActive", header: "Status" },
        { key: "createdAt", header: "Created At" },
      ]
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="users-export.csv"`);
    res.send(csv);
  })
);

export default router;
