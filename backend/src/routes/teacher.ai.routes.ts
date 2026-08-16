import { Router } from "express";
import { z } from "zod";
import { Difficulty, QuestionType, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { recordAudit } from "../lib/audit";
import { requireTeacherProfileId } from "../utils/context";
import { generateQuestionsFromNotes } from "../lib/gemini";
import { assertValidCorrectness } from "./teacher.questions.routes";

const router = Router();
router.use(authenticate, requireRole(Role.TEACHER));

const generateSchema = z.object({
  notes: z.string().min(20, "Please provide more detailed notes to generate questions from").max(20000),
  count: z.number().int().min(1).max(20).default(5),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "MIXED"]).default("MEDIUM"),
  questionType: z.enum(["SINGLE_CHOICE", "MULTIPLE_SELECT", "MIXED"]).default("SINGLE_CHOICE"),
  topic: z.string().max(200).optional(),
});

router.post(
  "/generate-questions",
  validateBody(generateSchema),
  asyncHandler(async (req, res) => {
    await requireTeacherProfileId(req);
    const questions = await generateQuestionsFromNotes(req.body);
    res.json({ data: questions });
  })
);

const optionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

const reviewedQuestionSchema = z.object({
  text: z.string().min(3),
  type: z.nativeEnum(QuestionType),
  difficulty: z.nativeEnum(Difficulty),
  explanation: z.string().optional(),
  marks: z.number().int().min(1).default(1),
  options: z.array(optionSchema).min(2).max(6),
});

const saveSchema = z.object({
  subjectId: z.string(),
  classId: z.string().optional(),
  topic: z.string().min(1),
  questions: z.array(reviewedQuestionSchema).min(1).max(50),
});

router.post(
  "/save-questions",
  validateBody(saveSchema),
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const { subjectId, classId, topic, questions } = req.body;

    for (const q of questions) {
      assertValidCorrectness(q.type, q.options);
    }

    const created = await prisma.$transaction(
      questions.map((q: (typeof questions)[number]) =>
        prisma.question.create({
          data: {
            subjectId,
            classId,
            topic,
            text: q.text,
            type: q.type,
            difficulty: q.difficulty,
            marks: q.marks,
            explanation: q.explanation,
            teacherId,
            options: { create: q.options.map((o: { text: string; isCorrect: boolean }, i: number) => ({ ...o, order: i })) },
          },
          include: { options: { orderBy: { order: "asc" } } },
        })
      )
    );

    await recordAudit({
      actorId: req.user!.sub,
      action: "QUESTION_AI_GENERATED",
      entityType: "Question",
      entityId: created.map((c) => c.id).join(","),
      metadata: { count: created.length, topic },
    });

    res.status(201).json({ data: created });
  })
);

export default router;
