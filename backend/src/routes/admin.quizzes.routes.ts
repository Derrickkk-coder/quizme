import { Router } from "express";
import { z } from "zod";
import { QuizStatus, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { paginationMeta, paginationSchema } from "../utils/pagination";
import { syncQuizStatuses } from "../lib/quizStatus";
import { safeUserSelect } from "../utils/safeSelects";

const router = Router();
router.use(authenticate, requireRole(Role.ADMIN));

const listQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(QuizStatus).optional(),
  subjectId: z.string().optional(),
  classId: z.string().optional(),
  search: z.string().optional(),
});

router.get(
  "/",
  validateQuery(listQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, pageSize, status, subjectId, classId, search } = req.query as unknown as z.infer<typeof listQuerySchema>;

    const where: any = {
      ...(subjectId ? { subjectId } : {}),
      ...(classId ? { classId } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    };

    const [total, rawQuizzes] = await Promise.all([
      prisma.quiz.count({ where }),
      prisma.quiz.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          subject: true,
          class: true,
          teacher: { include: { user: { select: safeUserSelect } } },
          _count: { select: { questions: true, attempts: true } },
        },
      }),
    ]);

    const quizzes = await syncQuizStatuses(rawQuizzes);
    const filtered = status ? quizzes.filter((q) => q.status === status) : quizzes;

    res.json({ data: filtered, meta: paginationMeta(total, page, pageSize) });
  })
);

export default router;
