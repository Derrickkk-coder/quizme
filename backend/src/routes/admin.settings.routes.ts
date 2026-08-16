import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { recordAudit } from "../lib/audit";
import { ensureDefaultGradeBands } from "../lib/grade";

const router = Router();
router.use(authenticate, requireRole(Role.ADMIN));

// ─── Grade bands ──────────────────────────────────────────────────────

router.get(
  "/grade-bands",
  asyncHandler(async (_req, res) => {
    await ensureDefaultGradeBands();
    const bands = await prisma.gradeBand.findMany({ orderBy: { minPercent: "desc" } });
    res.json({ data: bands });
  })
);

const gradeBandsSchema = z.array(
  z.object({
    grade: z.string().min(1),
    minPercent: z.number().int().min(0).max(100),
    maxPercent: z.number().int().min(0).max(100),
    label: z.string().optional(),
  })
);

router.put(
  "/grade-bands",
  validateBody(gradeBandsSchema),
  asyncHandler(async (req, res) => {
    await prisma.$transaction([
      prisma.gradeBand.deleteMany(),
      prisma.gradeBand.createMany({ data: req.body }),
    ]);
    await recordAudit({ actorId: req.user!.sub, action: "GRADE_SCALE_UPDATED", entityType: "GradeBand", req });
    const bands = await prisma.gradeBand.findMany({ orderBy: { minPercent: "desc" } });
    res.json({ data: bands });
  })
);

// ─── Academic years & terms ───────────────────────────────────────────

router.get(
  "/academic-years",
  asyncHandler(async (_req, res) => {
    const years = await prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      include: { terms: { orderBy: { startDate: "asc" } } },
    });
    res.json({ data: years });
  })
);

const yearSchema = z.object({
  name: z.string().min(2),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().optional(),
});

router.post(
  "/academic-years",
  validateBody(yearSchema),
  asyncHandler(async (req, res) => {
    if (req.body.isCurrent) {
      await prisma.academicYear.updateMany({ data: { isCurrent: false }, where: {} });
    }
    const created = await prisma.academicYear.create({ data: req.body });
    await recordAudit({ actorId: req.user!.sub, action: "ACADEMIC_YEAR_CREATED", entityType: "AcademicYear", entityId: created.id, req });
    res.status(201).json({ data: created });
  })
);

const updateYearSchema = z.object({
  name: z.string().min(2).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isCurrent: z.boolean().optional(),
});

router.patch(
  "/academic-years/:id",
  validateBody(updateYearSchema),
  asyncHandler(async (req, res) => {
    if (req.body.isCurrent) {
      await prisma.academicYear.updateMany({ data: { isCurrent: false }, where: {} });
    }
    const updated = await prisma.academicYear.update({ where: { id: req.params.id }, data: req.body });
    await recordAudit({ actorId: req.user!.sub, action: "ACADEMIC_YEAR_UPDATED", entityType: "AcademicYear", entityId: updated.id, req });
    res.json({ data: updated });
  })
);

router.delete(
  "/academic-years/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.academicYear.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Academic year not found");

    await prisma.term.deleteMany({ where: { academicYearId: req.params.id } });
    await prisma.academicYear.delete({ where: { id: req.params.id } });
    await recordAudit({ actorId: req.user!.sub, action: "ACADEMIC_YEAR_DELETED", entityType: "AcademicYear", entityId: req.params.id, req });
    res.status(204).send();
  })
);

const termSchema = z.object({
  academicYearId: z.string(),
  name: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().optional(),
});

router.post(
  "/terms",
  validateBody(termSchema),
  asyncHandler(async (req, res) => {
    if (req.body.isCurrent) {
      await prisma.term.updateMany({ data: { isCurrent: false }, where: {} });
    }
    const created = await prisma.term.create({ data: req.body });
    await recordAudit({ actorId: req.user!.sub, action: "TERM_CREATED", entityType: "Term", entityId: created.id, req });
    res.status(201).json({ data: created });
  })
);

const updateTermSchema = z.object({
  name: z.string().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isCurrent: z.boolean().optional(),
});

router.patch(
  "/terms/:id",
  validateBody(updateTermSchema),
  asyncHandler(async (req, res) => {
    if (req.body.isCurrent) {
      await prisma.term.updateMany({ data: { isCurrent: false }, where: {} });
    }
    const updated = await prisma.term.update({ where: { id: req.params.id }, data: req.body });
    await recordAudit({ actorId: req.user!.sub, action: "TERM_UPDATED", entityType: "Term", entityId: updated.id, req });
    res.json({ data: updated });
  })
);

router.delete(
  "/terms/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.term.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Term not found");

    await prisma.term.delete({ where: { id: req.params.id } });
    await recordAudit({ actorId: req.user!.sub, action: "TERM_DELETED", entityType: "Term", entityId: req.params.id, req });
    res.status(204).send();
  })
);

export default router;
