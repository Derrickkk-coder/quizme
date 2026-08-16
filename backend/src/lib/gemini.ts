// @google/genai is an ESM-only package; this backend runs as CommonJS, so it
// must be loaded via dynamic import() rather than a static import.
import type { GoogleGenAI as GoogleGenAIType } from "@google/genai" with { "resolution-mode": "import" };
import { z } from "zod";
import { QuestionType } from "@prisma/client";
import { env } from "./env";
import { HttpError } from "../middleware/errorHandler";

let client: GoogleGenAIType | null = null;

async function getClient(): Promise<GoogleGenAIType> {
  if (!env.geminiApiKey) {
    throw new HttpError(503, "AI question generation is not configured on this server");
  }
  if (!client) {
    const { GoogleGenAI } = await import("@google/genai");
    client = new GoogleGenAI({ apiKey: env.geminiApiKey });
  }
  return client;
}

// Gemini returns HTTP 503 (model overloaded) or 429 (rate limited) for
// transient load spikes — Google's own guidance is to retry these.
async function isRetryableApiError(err: unknown): Promise<boolean> {
  const { ApiError } = await import("@google/genai");
  return err instanceof ApiError && (err.status === 503 || err.status === 429);
}

// Mirrors the @google/genai `Type` enum values (plain strings, so this file
// doesn't need the dynamic import just to build a schema literal).
const responseSchema = {
  type: "OBJECT",
  properties: {
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          type: { type: "STRING", enum: ["SINGLE_CHOICE", "MULTIPLE_SELECT"] },
          difficulty: { type: "STRING", enum: ["EASY", "MEDIUM", "HARD"] },
          explanation: { type: "STRING" },
          options: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                text: { type: "STRING" },
                isCorrect: { type: "BOOLEAN" },
              },
              required: ["text", "isCorrect"],
            },
          },
        },
        required: ["text", "type", "difficulty", "explanation", "options"],
      },
    },
  },
  required: ["questions"],
};

const GeneratedOptionSchema = z.object({
  text: z.string(),
  isCorrect: z.boolean(),
});

const GeneratedQuestionSchema = z.object({
  text: z.string(),
  type: z.enum(["SINGLE_CHOICE", "MULTIPLE_SELECT"]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  explanation: z.string(),
  options: z.array(GeneratedOptionSchema).min(2).max(6),
});

const GeneratedQuizSchema = z.object({
  questions: z.array(GeneratedQuestionSchema),
});

export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;

export type GenerateQuestionsParams = {
  notes: string;
  count: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "MIXED";
  questionType: QuestionType | "MIXED";
  topic?: string;
};

export async function generateQuestionsFromNotes(params: GenerateQuestionsParams): Promise<GeneratedQuestion[]> {
  const ai = await getClient();

  const difficultyInstruction =
    params.difficulty === "MIXED"
      ? "Vary the difficulty across the questions, mixing easy, medium, and hard."
      : `All questions must be at "${params.difficulty}" difficulty.`;

  const typeInstruction =
    params.questionType === "MIXED"
      ? 'Vary the question type across the set: use "SINGLE_CHOICE" for questions with exactly one correct answer and "MULTIPLE_SELECT" for questions with more than one correct answer.'
      : params.questionType === QuestionType.MULTIPLE_SELECT
        ? 'Every question must be type "MULTIPLE_SELECT" with at least 2 and at most 5 correct options marked isCorrect: true (never all options correct).'
        : 'Every question must be type "SINGLE_CHOICE" with exactly one option marked isCorrect: true.';

  const prompt = [
    `Generate exactly ${params.count} quiz questions based only on the following notes.`,
    params.topic ? `Topic focus: ${params.topic}` : null,
    difficultyInstruction,
    typeInstruction,
    "Each question needs 2 to 6 answer options. Provide a brief explanation of the correct answer(s) for each question.",
    "---- NOTES START ----",
    params.notes,
    "---- NOTES END ----",
  ]
    .filter(Boolean)
    .join("\n\n");

  // Try the newest model first, then fall back to an older (usually less
  // congested) one if it's overloaded — each with one immediate try and one
  // retry after a short delay.
  const attemptPlan = [
    { model: "gemini-3.7-flash", delayMs: 0 },
    { model: "gemini-3.7-flash", delayMs: 1500 },
    { model: "gemini-2.5-flash", delayMs: 0 },
    { model: "gemini-2.5-flash", delayMs: 1500 },
  ];

  let response: Awaited<ReturnType<GoogleGenAIType["models"]["generateContent"]>> | undefined;
  let lastErr: unknown;

  for (const { model, delayMs } of attemptPlan) {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    try {
      response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction:
            "You are an assistant that writes exam-quality multiple choice quiz questions for Junior High School (JHS) students, strictly grounded in the teacher's notes provided. Do not invent facts that are not supported by the notes. Keep language age-appropriate and unambiguous.",
          responseMimeType: "application/json",
          responseSchema,
        },
      });
      lastErr = undefined;
      break;
    } catch (err) {
      lastErr = err;
      if (!(await isRetryableApiError(err))) break;
    }
  }

  if (lastErr || !response) {
    console.error("Gemini generateContent failed:", lastErr);
    const detail = lastErr instanceof Error ? lastErr.message : String(lastErr);
    throw new HttpError(502, `The AI service is temporarily unavailable. Please try again in a moment. (${detail})`);
  }

  const raw = response.text;
  if (!raw) {
    throw new HttpError(502, "The AI service could not generate valid questions from these notes. Please try again.");
  }

  const parsedJson = JSON.parse(raw);
  const parsed = GeneratedQuizSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new HttpError(502, "The AI service returned questions in an unexpected format. Please try again.");
  }

  return parsed.data.questions;
}
