import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
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

export default router;
