import { Router } from "express";
import { z } from "zod";
import { AttemptStatus, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { requireStudentProfileId } from "../utils/context";
import { computeClassLeaderboard, computeStudentPerformance } from "../lib/performance";
import { paginationMeta, paginationSchema } from "../utils/pagination";

const router = Router();
router.use(authenticate, requireRole(Role.STUDENT));

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const studentId = await requireStudentProfileId(req);
    const data = await computeStudentPerformance(studentId);
    res.json({ data });
  })
);

router.get(
  "/leaderboard",
  asyncHandler(async (req, res) => {
    const studentId = await requireStudentProfileId(req);
    const data = await computeClassLeaderboard(studentId);
    res.json({ data });
  })
);

router.get(
  "/results",
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const studentId = await requireStudentProfileId(req);
    const { page, pageSize } = req.query as unknown as z.infer<typeof paginationSchema>;

    const where = { studentId, status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED] } };

    const [total, attempts] = await Promise.all([
      prisma.quizAttempt.count({ where }),
      prisma.quizAttempt.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { quiz: { include: { subject: true, class: true } } },
      }),
    ]);

    res.json({ data: attempts, meta: paginationMeta(total, page, pageSize) });
  })
);

export default router;
