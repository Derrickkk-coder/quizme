import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { paginationMeta, paginationSchema } from "../utils/pagination";

const router = Router();
router.use(authenticate, requireRole(Role.ADMIN));

const listQuerySchema = paginationSchema.extend({
  action: z.string().optional(),
  entityType: z.string().optional(),
  actorId: z.string().optional(),
});

router.get(
  "/",
  validateQuery(listQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, pageSize, action, entityType, actorId } = req.query as unknown as z.infer<typeof listQuerySchema>;

    const where: any = {
      ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
      ...(entityType ? { entityType } : {}),
      ...(actorId ? { actorId } : {}),
    };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      }),
    ]);

    res.json({ data: logs, meta: paginationMeta(total, page, pageSize) });
  })
);

export default router;
