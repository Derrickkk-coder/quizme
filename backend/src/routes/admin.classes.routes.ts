import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { recordAudit } from "../lib/audit";

const router = Router();
router.use(authenticate, requireRole(Role.ADMIN));

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const classes = await prisma.class.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { students: true, quizzes: true } } },
    });
    res.json({ data: classes });
  })
);

const classSchema = z.object({
  name: z.string().min(2),
  level: z.string().optional(),
});

router.post(
  "/",
  validateBody(classSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.class.findUnique({ where: { name: req.body.name } });
    if (existing) throw new HttpError(409, "A class with this name already exists");

    const created = await prisma.class.create({ data: req.body });
    await recordAudit({ actorId: req.user!.sub, action: "CLASS_CREATED", entityType: "Class", entityId: created.id, req });
    res.status(201).json({ data: created });
  })
);

router.patch(
  "/:id",
  validateBody(classSchema.partial()),
  asyncHandler(async (req, res) => {
    const updated = await prisma.class.update({ where: { id: req.params.id }, data: req.body });
    await recordAudit({ actorId: req.user!.sub, action: "CLASS_UPDATED", entityType: "Class", entityId: updated.id, req });
    res.json({ data: updated });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const studentCount = await prisma.studentProfile.count({ where: { classId: req.params.id } });
    if (studentCount > 0) throw new HttpError(400, "Cannot delete a class that still has students assigned");

    await prisma.class.delete({ where: { id: req.params.id } });
    await recordAudit({ actorId: req.user!.sub, action: "CLASS_DELETED", entityType: "Class", entityId: req.params.id, req });
    res.status(204).send();
  })
);

export default router;
