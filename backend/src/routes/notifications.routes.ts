import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { paginationMeta, paginationSchema } from "../utils/pagination";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = req.query as unknown as z.infer<typeof paginationSchema>;
    const where = { userId: req.user!.sub };

    const [total, unreadCount, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({ data: notifications, unreadCount, meta: paginationMeta(total, page, pageSize) });
  })
);

router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.sub },
      data: { isRead: true },
    });
    res.json({ message: "Marked as read" });
  })
);

router.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user!.sub, isRead: false }, data: { isRead: true } });
    res.json({ message: "All notifications marked as read" });
  })
);

export default router;
