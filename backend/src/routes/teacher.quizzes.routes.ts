import { Router } from "express";
import { z } from "zod";
import { Difficulty, NotificationType, QuizStatus, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { recordAudit } from "../lib/audit";
import { requireTeacherProfileId } from "../utils/context";
import { paginationMeta, paginationSchema } from "../utils/pagination";
import { syncQuizStatus, syncQuizStatuses } from "../lib/quizStatus";
import { notifyMany } from "../lib/notify";
import { safeUserSelect } from "../utils/safeSelects";

const router = Router();
router.use(authenticate, requireRole(Role.TEACHER));

const quizInclude = {
  subject: true,
  class: true,
  term: true,
  questions: { orderBy: { order: "asc" as const }, include: { question: { include: { options: true } } } },
  _count: { select: { attempts: true } },
};

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
    const teacherId = await requireTeacherProfileId(req);
    const { page, pageSize, status, subjectId, classId, search } = req.query as unknown as z.infer<typeof listQuerySchema>;

    const where: any = {
      teacherId,
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
        include: quizInclude,
      }),
    ]);

    const quizzes = await syncQuizStatuses(rawQuizzes);
    const filtered = status ? quizzes.filter((q) => q.status === status) : quizzes;

    res.json({ data: filtered, meta: paginationMeta(total, page, pageSize) });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const quiz = await prisma.quiz.findFirst({ where: { id: req.params.id, teacherId }, include: quizInclude });
    if (!quiz) throw new HttpError(404, "Quiz not found");
    const synced = await syncQuizStatus(quiz);
    res.json({ data: synced });
  })
);

const quizSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  instructions: z.string().optional(),
  subjectId: z.string(),
  classId: z.string(),
  termId: z.string().optional(),
  durationMinutes: z.number().int().min(1).max(300),
  passingScore: z.number().int().min(0).max(100).default(50),
  difficulty: z.nativeEnum(Difficulty).default(Difficulty.MEDIUM),
  opensAt: z.coerce.date().optional(),
  closesAt: z.coerce.date().optional(),
  maxAttempts: z.number().int().min(1).max(10).default(1),
  randomizeQuestions: z.boolean().default(true),
  randomizeOptions: z.boolean().default(true),
  showCorrectAnswers: z.boolean().default(false),
  showExplanations: z.boolean().default(true),
  showResultsImmediately: z.boolean().default(true),
});

router.post(
  "/",
  validateBody(quizSchema),
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);

    if (req.body.opensAt && req.body.closesAt && req.body.opensAt >= req.body.closesAt) {
      throw new HttpError(400, "Closing date must be after the opening date");
    }

    const quiz = await prisma.quiz.create({
      data: { ...req.body, teacherId },
      include: quizInclude,
    });

    await recordAudit({ actorId: req.user!.sub, action: "QUIZ_CREATED", entityType: "Quiz", entityId: quiz.id, req });

    res.status(201).json({ data: quiz });
  })
);

router.patch(
  "/:id",
  validateBody(quizSchema.partial()),
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const existing = await prisma.quiz.findFirst({ where: { id: req.params.id, teacherId } });
    if (!existing) throw new HttpError(404, "Quiz not found");

    const opensAt = req.body.opensAt ?? existing.opensAt;
    const closesAt = req.body.closesAt ?? existing.closesAt;
    if (opensAt && closesAt && opensAt >= closesAt) {
      throw new HttpError(400, "Closing date must be after the opening date");
    }

    const quiz = await prisma.quiz.update({ where: { id: existing.id }, data: req.body, include: quizInclude });
    await recordAudit({ actorId: req.user!.sub, action: "QUIZ_UPDATED", entityType: "Quiz", entityId: quiz.id, req });

    res.json({ data: quiz });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const existing = await prisma.quiz.findFirst({ where: { id: req.params.id, teacherId }, include: { _count: { select: { attempts: true } } } });
    if (!existing) throw new HttpError(404, "Quiz not found");
    if (existing._count.attempts > 0) {
      throw new HttpError(400, "This quiz already has student attempts and cannot be deleted. Close it instead.");
    }

    await prisma.quiz.delete({ where: { id: existing.id } });
    await recordAudit({ actorId: req.user!.sub, action: "QUIZ_DELETED", entityType: "Quiz", entityId: existing.id, req });
    res.status(204).send();
  })
);

router.post(
  "/:id/duplicate",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const existing = await prisma.quiz.findFirst({
      where: { id: req.params.id, teacherId },
      include: { questions: true },
    });
    if (!existing) throw new HttpError(404, "Quiz not found");

    const duplicate = await prisma.quiz.create({
      data: {
        title: `${existing.title} (Copy)`,
        description: existing.description,
        instructions: existing.instructions,
        subjectId: existing.subjectId,
        classId: existing.classId,
        termId: existing.termId,
        teacherId,
        durationMinutes: existing.durationMinutes,
        passingScore: existing.passingScore,
        difficulty: existing.difficulty,
        maxAttempts: existing.maxAttempts,
        randomizeQuestions: existing.randomizeQuestions,
        randomizeOptions: existing.randomizeOptions,
        showCorrectAnswers: existing.showCorrectAnswers,
        showExplanations: existing.showExplanations,
        showResultsImmediately: existing.showResultsImmediately,
        status: QuizStatus.DRAFT,
        questions: {
          create: existing.questions.map((q) => ({ questionId: q.questionId, order: q.order, marksOverride: q.marksOverride })),
        },
      },
      include: quizInclude,
    });

    await recordAudit({ actorId: req.user!.sub, action: "QUIZ_DUPLICATED", entityType: "Quiz", entityId: duplicate.id, metadata: { sourceId: existing.id }, req });

    res.status(201).json({ data: duplicate });
  })
);

router.post(
  "/:id/publish",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const existing = await prisma.quiz.findFirst({
      where: { id: req.params.id, teacherId },
      include: { questions: true, class: { include: { students: { include: { user: { select: safeUserSelect } } } } } },
    });
    if (!existing) throw new HttpError(404, "Quiz not found");
    if (existing.questions.length === 0) throw new HttpError(400, "Add at least one question before publishing");

    const now = new Date();
    const status = existing.opensAt && existing.opensAt > now ? QuizStatus.SCHEDULED : QuizStatus.ACTIVE;

    const quiz = await prisma.quiz.update({ where: { id: existing.id }, data: { status }, include: quizInclude });

    const studentUserIds = existing.class.students.map((s) => s.user.id);
    await notifyMany(studentUserIds, {
      type: NotificationType.QUIZ_ASSIGNED,
      title: "New quiz assigned",
      message: `"${existing.title}" has been assigned to your class.`,
    });

    await recordAudit({ actorId: req.user!.sub, action: "QUIZ_PUBLISHED", entityType: "Quiz", entityId: quiz.id, req });

    res.json({ data: quiz });
  })
);

router.post(
  "/:id/unpublish",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const existing = await prisma.quiz.findFirst({ where: { id: req.params.id, teacherId } });
    if (!existing) throw new HttpError(404, "Quiz not found");

    const quiz = await prisma.quiz.update({ where: { id: existing.id }, data: { status: QuizStatus.DRAFT }, include: quizInclude });
    await recordAudit({ actorId: req.user!.sub, action: "QUIZ_UNPUBLISHED", entityType: "Quiz", entityId: quiz.id, req });
    res.json({ data: quiz });
  })
);

router.post(
  "/:id/close",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const existing = await prisma.quiz.findFirst({ where: { id: req.params.id, teacherId } });
    if (!existing) throw new HttpError(404, "Quiz not found");

    const quiz = await prisma.quiz.update({ where: { id: existing.id }, data: { status: QuizStatus.CLOSED }, include: quizInclude });
    await recordAudit({ actorId: req.user!.sub, action: "QUIZ_CLOSED", entityType: "Quiz", entityId: quiz.id, req });
    res.json({ data: quiz });
  })
);

// ─── Questions within a quiz ────────────────────────────────────────────

const addQuestionsSchema = z.object({ questionIds: z.array(z.string()).min(1) });

router.post(
  "/:id/questions",
  validateBody(addQuestionsSchema),
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const quiz = await prisma.quiz.findFirst({ where: { id: req.params.id, teacherId }, include: { questions: true, _count: { select: { attempts: true } } } });
    if (!quiz) throw new HttpError(404, "Quiz not found");
    if (quiz._count.attempts > 0) throw new HttpError(400, "Cannot modify questions after students have started attempting this quiz");

    const questions = await prisma.question.findMany({ where: { id: { in: req.body.questionIds }, teacherId } });
    if (questions.length !== req.body.questionIds.length) throw new HttpError(400, "One or more questions were not found in your question bank");

    let order = quiz.questions.length;
    const existingIds = new Set(quiz.questions.map((q) => q.questionId));
    const toAdd = questions.filter((q) => !existingIds.has(q.id));

    await prisma.quizQuestion.createMany({
      data: toAdd.map((q) => ({ quizId: quiz.id, questionId: q.id, order: order++ })),
    });

    const updated = await prisma.quiz.findUnique({ where: { id: quiz.id }, include: quizInclude });
    res.status(201).json({ data: updated });
  })
);

router.delete(
  "/:id/questions/:quizQuestionId",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const quiz = await prisma.quiz.findFirst({ where: { id: req.params.id, teacherId }, include: { _count: { select: { attempts: true } } } });
    if (!quiz) throw new HttpError(404, "Quiz not found");
    if (quiz._count.attempts > 0) throw new HttpError(400, "Cannot modify questions after students have started attempting this quiz");

    await prisma.quizQuestion.delete({ where: { id: req.params.quizQuestionId } });
    const updated = await prisma.quiz.findUnique({ where: { id: quiz.id }, include: quizInclude });
    res.json({ data: updated });
  })
);

const reorderSchema = z.object({ quizQuestionIds: z.array(z.string()).min(1) });

router.patch(
  "/:id/questions/reorder",
  validateBody(reorderSchema),
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const quiz = await prisma.quiz.findFirst({ where: { id: req.params.id, teacherId } });
    if (!quiz) throw new HttpError(404, "Quiz not found");

    await prisma.$transaction(
      req.body.quizQuestionIds.map((id: string, index: number) =>
        prisma.quizQuestion.update({ where: { id }, data: { order: index } })
      )
    );

    const updated = await prisma.quiz.findUnique({ where: { id: quiz.id }, include: quizInclude });
    res.json({ data: updated });
  })
);

const autoGenerateSchema = z.object({
  subjectId: z.string(),
  classId: z.string().optional(),
  topic: z.string().optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  count: z.number().int().min(1).max(100),
});

router.post(
  "/:id/questions/auto-generate",
  validateBody(autoGenerateSchema),
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const quiz = await prisma.quiz.findFirst({ where: { id: req.params.id, teacherId }, include: { questions: true } });
    if (!quiz) throw new HttpError(404, "Quiz not found");

    const { subjectId, classId, topic, difficulty, count } = req.body;
    const existingIds = quiz.questions.map((q) => q.questionId);

    const candidates = await prisma.question.findMany({
      where: {
        teacherId,
        subjectId,
        ...(classId ? { classId } : {}),
        ...(topic ? { topic: { contains: topic, mode: "insensitive" } } : {}),
        ...(difficulty ? { difficulty } : {}),
        id: { notIn: existingIds },
      },
    });

    if (candidates.length === 0) {
      throw new HttpError(400, "No matching questions were found in the question bank for these criteria");
    }

    const shuffled = candidates.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    let order = quiz.questions.length;
    await prisma.quizQuestion.createMany({
      data: selected.map((q) => ({ quizId: quiz.id, questionId: q.id, order: order++ })),
    });

    const updated = await prisma.quiz.findUnique({ where: { id: quiz.id }, include: quizInclude });
    res.status(201).json({ data: updated, meta: { requested: count, added: selected.length, available: candidates.length } });
  })
);

export default router;
