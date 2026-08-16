import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { recordAudit } from "../lib/audit";
import { safeUserSelect } from "../utils/safeSelects";

const router = Router();
router.use(authenticate, requireRole(Role.ADMIN));

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { quizzes: true, questions: true } },
        assignments: { include: { teacher: { include: { user: { select: safeUserSelect } } } } },
      },
    });
    res.json({ data: subjects });
  })
);

const subjectSchema = z.object({
  name: z.string().min(2),
  code: z.string().optional(),
});

router.post(
  "/",
  validateBody(subjectSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.subject.findUnique({ where: { name: req.body.name } });
    if (existing) throw new HttpError(409, "A subject with this name already exists");

    const created = await prisma.subject.create({ data: req.body });
    await recordAudit({ actorId: req.user!.sub, action: "SUBJECT_CREATED", entityType: "Subject", entityId: created.id, req });
    res.status(201).json({ data: created });
  })
);

router.patch(
  "/:id",
  validateBody(subjectSchema.partial()),
  asyncHandler(async (req, res) => {
    const updated = await prisma.subject.update({ where: { id: req.params.id }, data: req.body });
    await recordAudit({ actorId: req.user!.sub, action: "SUBJECT_UPDATED", entityType: "Subject", entityId: updated.id, req });
    res.json({ data: updated });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.subject.delete({ where: { id: req.params.id } });
    await recordAudit({ actorId: req.user!.sub, action: "SUBJECT_DELETED", entityType: "Subject", entityId: req.params.id, req });
    res.status(204).send();
  })
);

const assignSchema = z.object({
  teacherId: z.string(),
});

router.post(
  "/:id/assignments",
  validateBody(assignSchema),
  asyncHandler(async (req, res) => {
    const { teacherId } = req.body;
    const subjectId = req.params.id;

    const existing = await prisma.teacherClassSubject.findUnique({
      where: { teacherId_subjectId: { teacherId, subjectId } },
    });
    if (existing) throw new HttpError(409, "This teacher is already assigned to this subject");

    const created = await prisma.teacherClassSubject.create({
      data: { teacherId, subjectId },
      include: { teacher: { include: { user: { select: safeUserSelect } } }, subject: true },
    });

    await recordAudit({
      actorId: req.user!.sub,
      action: "TEACHER_ASSIGNED",
      entityType: "TeacherClassSubject",
      entityId: created.id,
      metadata: { teacherId, subjectId },
      req,
    });

    res.status(201).json({ data: created });
  })
);

router.delete(
  "/assignments/:assignmentId",
  asyncHandler(async (req, res) => {
    await prisma.teacherClassSubject.delete({ where: { id: req.params.assignmentId } });
    await recordAudit({
      actorId: req.user!.sub,
      action: "TEACHER_UNASSIGNED",
      entityType: "TeacherClassSubject",
      entityId: req.params.assignmentId,
      req,
    });
    res.status(204).send();
  })
);

export default router;
