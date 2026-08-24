import { Router } from "express";
import { z } from "zod";
import { Difficulty, QuestionType, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { recordAudit } from "../lib/audit";
import { requireTeacherProfileId } from "../utils/context";
import { paginationMeta, paginationSchema } from "../utils/pagination";

const router = Router();
router.use(authenticate, requireRole(Role.TEACHER));

const listQuerySchema = paginationSchema.extend({
  subjectId: z.string().optional(),
  classId: z.string().optional(),
  topic: z.string().optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  search: z.string().optional(),
});

router.get(
  "/",
  validateQuery(listQuerySchema),
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const { page, pageSize, subjectId, classId, topic, difficulty, search } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >;

    const where: any = {
      teacherId,
      ...(subjectId ? { subjectId } : {}),
      ...(classId ? { classId } : {}),
      ...(topic ? { topic: { contains: topic, mode: "insensitive" } } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(search ? { text: { contains: search, mode: "insensitive" } } : {}),
    };

    const [total, questions] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { options: { orderBy: { order: "asc" } }, subject: true, class: true },
      }),
    ]);

    res.json({ data: questions, meta: paginationMeta(total, page, pageSize) });
  })
);

router.get(
  "/topics",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const rows = await prisma.question.findMany({
      where: { teacherId },
      select: { topic: true },
      distinct: ["topic"],
    });
    res.json({ data: rows.map((r) => r.topic) });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const question = await prisma.question.findFirst({
      where: { id: req.params.id, teacherId },
      include: { options: { orderBy: { order: "asc" } }, subject: true, class: true },
    });
    if (!question) throw new HttpError(404, "Question not found");
    res.json({ data: question });
  })
);

const optionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

const questionSchema = z.object({
  subjectId: z.string(),
  classId: z.string().optional(),
  topic: z.string().min(1),
  text: z.string().min(3),
  type: z.nativeEnum(QuestionType).default(QuestionType.SINGLE_CHOICE),
  difficulty: z.nativeEnum(Difficulty).default(Difficulty.MEDIUM),
  marks: z.number().int().min(1).default(1),
  explanation: z.string().optional(),
  options: z.array(optionSchema).min(2).max(6),
});

export function assertValidCorrectness(type: QuestionType, options: { isCorrect: boolean }[]) {
  const correctCount = options.filter((o) => o.isCorrect).length;
  if (type === QuestionType.SINGLE_CHOICE) {
    if (correctCount !== 1) {
      throw new HttpError(400, "Multiple choice questions must have exactly one correct option");
    }
  } else {
    if (correctCount < 1) {
      throw new HttpError(400, "Multiple selection questions must have at least one correct option");
    }
    if (correctCount >= options.length) {
      throw new HttpError(400, "At least one option must be incorrect");
    }
  }
}

router.post(
  "/",
  validateBody(questionSchema),
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const { options, ...rest } = req.body;
    assertValidCorrectness(rest.type, options);

    const question = await prisma.question.create({
      data: {
        ...rest,
        teacherId,
        options: { create: options.map((o: any, i: number) => ({ ...o, order: i })) },
      },
      include: { options: { orderBy: { order: "asc" } } },
    });

    await recordAudit({ actorId: req.user!.sub, action: "QUESTION_CREATED", entityType: "Question", entityId: question.id, req });

    res.status(201).json({ data: question });
  })
);

const bulkImportRowSchema = z.object({
  topic: z.string().min(1),
  text: z.string().min(3),
  type: z.nativeEnum(QuestionType).default(QuestionType.SINGLE_CHOICE),
  difficulty: z.nativeEnum(Difficulty).default(Difficulty.MEDIUM),
  marks: z.number().int().min(1).default(1),
  explanation: z.string().optional(),
  options: z.array(optionSchema).min(2).max(6),
});

const bulkImportSchema = z.object({
  subjectId: z.string(),
  classId: z.string().optional(),
  questions: z.array(bulkImportRowSchema).min(1).max(300),
});

router.post(
  "/bulk-import",
  validateBody(bulkImportSchema),
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const { subjectId, classId, questions } = req.body;

    let createdCount = 0;
    const errors: { row: number; reason: string }[] = [];

    for (let i = 0; i < questions.length; i++) {
      const row = questions[i];
      try {
        assertValidCorrectness(row.type, row.options);
        await prisma.question.create({
          data: {
            teacherId,
            subjectId,
            classId: classId || null,
            topic: row.topic,
            text: row.text,
            type: row.type,
            difficulty: row.difficulty,
            marks: row.marks,
            explanation: row.explanation || null,
            options: { create: row.options.map((o: any, idx: number) => ({ ...o, order: idx })) },
          },
        });
        createdCount++;
      } catch (err) {
        errors.push({ row: i + 1, reason: err instanceof HttpError ? err.message : "Could not create this question" });
      }
    }

    if (createdCount > 0) {
      await recordAudit({
        actorId: req.user!.sub,
        action: "QUESTIONS_BULK_IMPORTED",
        entityType: "Question",
        metadata: { count: createdCount, subjectId },
        req,
      });
    }

    res.status(201).json({ data: { createdCount, errors } });
  })
);

const updateQuestionSchema = z.object({
  subjectId: z.string().optional(),
  classId: z.string().optional(),
  topic: z.string().min(1).optional(),
  text: z.string().min(3).optional(),
  type: z.nativeEnum(QuestionType).optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  marks: z.number().int().min(1).optional(),
  explanation: z.string().optional(),
  options: z.array(optionSchema).min(2).max(6).optional(),
});

router.patch(
  "/:id",
  validateBody(updateQuestionSchema),
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const existing = await prisma.question.findFirst({ where: { id: req.params.id, teacherId } });
    if (!existing) throw new HttpError(404, "Question not found");

    const { options, ...rest } = req.body;
    if (options) assertValidCorrectness(rest.type ?? existing.type, options);

    const question = await prisma.$transaction(async (tx) => {
      await tx.question.update({ where: { id: existing.id }, data: rest });
      if (options) {
        await tx.questionOption.deleteMany({ where: { questionId: existing.id } });
        await tx.questionOption.createMany({
          data: options.map((o: any, i: number) => ({ ...o, questionId: existing.id, order: i })),
        });
      }
      return tx.question.findUnique({
        where: { id: existing.id },
        include: { options: { orderBy: { order: "asc" } } },
      });
    });

    await recordAudit({ actorId: req.user!.sub, action: "QUESTION_UPDATED", entityType: "Question", entityId: existing.id, req });

    res.json({ data: question });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const existing = await prisma.question.findFirst({ where: { id: req.params.id, teacherId } });
    if (!existing) throw new HttpError(404, "Question not found");

    const usedInQuiz = await prisma.quizQuestion.findFirst({ where: { questionId: existing.id } });
    if (usedInQuiz) {
      throw new HttpError(400, "This question is used in a quiz and cannot be deleted. Remove it from the quiz first.");
    }

    await prisma.question.delete({ where: { id: existing.id } });
    await recordAudit({ actorId: req.user!.sub, action: "QUESTION_DELETED", entityType: "Question", entityId: existing.id, req });
    res.status(204).send();
  })
);

const bulkDeleteSchema = z.object({ questionIds: z.array(z.string()).min(1) });

router.post(
  "/bulk-delete",
  validateBody(bulkDeleteSchema),
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const { questionIds } = req.body;

    const questions = await prisma.question.findMany({ where: { id: { in: questionIds }, teacherId } });
    const usedQuestionIds = new Set(
      (
        await prisma.quizQuestion.findMany({
          where: { questionId: { in: questions.map((q) => q.id) } },
          select: { questionId: true },
        })
      ).map((qq) => qq.questionId)
    );

    const deletable = questions.filter((q) => !usedQuestionIds.has(q.id));
    const skipped = questions.filter((q) => usedQuestionIds.has(q.id)).map((q) => ({ id: q.id, text: q.text }));

    if (deletable.length > 0) {
      await prisma.question.deleteMany({ where: { id: { in: deletable.map((q) => q.id) } } });
      await recordAudit({
        actorId: req.user!.sub,
        action: "QUESTIONS_BULK_DELETED",
        entityType: "Question",
        metadata: { count: deletable.length, questionIds: deletable.map((q) => q.id) },
        req,
      });
    }

    res.json({ data: { deletedCount: deletable.length, skipped } });
  })
);

export default router;
