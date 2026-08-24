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

// 503 (overloaded) and 429 (rate limited) are transient — worth retrying the
// same model. 404 means this specific model isn't available to this API key
// (e.g. deprecated for new projects) — retrying it is pointless, move on to
// the next model in the chain instead. Anything else is not worth chasing.
//
// A raw fetch failure (connection reset, DNS blip, headers timeout) never
// even reaches the API, so it isn't a @google/genai ApiError — but it's just
// as transient as a 503, so it gets the same "retry-same" treatment rather
// than being given up on immediately.
async function classifyGeminiError(err: unknown): Promise<"retry-same" | "next-model" | "fatal"> {
  if (err instanceof TypeError && err.message === "fetch failed") return "retry-same";
  const { ApiError } = await import("@google/genai");
  if (!(err instanceof ApiError)) return "fatal";
  if (err.status === 503 || err.status === 429) return "retry-same";
  if (err.status === 404) return "next-model";
  return "fatal";
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

  // Try progressively "smaller"/older models if a bigger one is overloaded
  // or unavailable to this API key. Each model gets one immediate try and
  // one retry after a short delay before moving to the next model.
  const modelChain = ["gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];

  let response: Awaited<ReturnType<GoogleGenAIType["models"]["generateContent"]>> | undefined;
  let lastErr: unknown;

  modelLoop: for (const model of modelChain) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction:
              "You are an assistant that writes exam-quality multiple choice quiz questions for Junior High School (JHS) students, strictly grounded in the teacher's notes provided. Do not invent facts that are not supported by the notes. Keep language age-appropriate and unambiguous.",
            responseMimeType: "application/json",
            responseSchema,
            httpOptions: { timeout: 20000 },
          },
        });
        lastErr = undefined;
        break modelLoop;
      } catch (err) {
        lastErr = err;
        const verdict = await classifyGeminiError(err);
        if (verdict === "fatal") break modelLoop;
        if (verdict === "next-model") break;
        // "retry-same" falls through to the next attempt on this same model
      }
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

// ─── Short-answer grading ────────────────────────────────────────────────

const gradingResponseSchema = {
  type: "OBJECT",
  properties: {
    grades: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          questionId: { type: "STRING" },
          marksAwarded: { type: "INTEGER" },
          feedback: { type: "STRING" },
        },
        required: ["questionId", "marksAwarded", "feedback"],
      },
    },
  },
  required: ["grades"],
};

const GradedAnswerSchema = z.object({
  questionId: z.string(),
  marksAwarded: z.number().int().min(0),
  feedback: z.string(),
});

const GradingResultSchema = z.object({
  grades: z.array(GradedAnswerSchema),
});

export type ShortAnswerToGrade = {
  questionId: string;
  questionText: string;
  modelAnswer: string | null;
  marks: number;
  studentAnswer: string;
};

export type GradedShortAnswer = z.infer<typeof GradedAnswerSchema>;

export async function gradeShortAnswers(items: ShortAnswerToGrade[]): Promise<GradedShortAnswer[]> {
  const ai = await getClient();

  const prompt = [
    "Grade each of the following short-answer quiz responses from a Junior High School (JHS) student.",
    "For each question, award an integer number of marks from 0 up to the question's max marks — partial credit is expected and encouraged for partially correct answers, not just all-or-nothing.",
    "Judge the student's answer against the model answer's meaning, not exact wording. Accept reasonable synonyms, paraphrasing, and minor spelling mistakes.",
    "Write one short sentence of feedback per question explaining the grade, addressed directly to the student.",
    "---- QUESTIONS ----",
    JSON.stringify(
      items.map((i) => ({
        questionId: i.questionId,
        question: i.questionText,
        modelAnswer: i.modelAnswer ?? "(no model answer provided — grade based on general subject knowledge)",
        maxMarks: i.marks,
        studentAnswer: i.studentAnswer,
      })),
      null,
      2
    ),
    "---- END QUESTIONS ----",
    "Return exactly one grade entry per question, matching questionId exactly as given.",
  ].join("\n\n");

  const modelChain = ["gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];

  let response: Awaited<ReturnType<GoogleGenAIType["models"]["generateContent"]>> | undefined;
  let lastErr: unknown;

  modelLoop: for (const model of modelChain) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction:
              "You are a fair, consistent exam grader for Junior High School (JHS) students. Grade generously for demonstrated understanding, not exact phrasing.",
            responseMimeType: "application/json",
            responseSchema: gradingResponseSchema,
            httpOptions: { timeout: 20000 },
          },
        });
        lastErr = undefined;
        break modelLoop;
      } catch (err) {
        lastErr = err;
        const verdict = await classifyGeminiError(err);
        if (verdict === "fatal") break modelLoop;
        if (verdict === "next-model") break;
      }
    }
  }

  if (lastErr || !response) {
    console.error("Gemini short-answer grading failed:", lastErr);
    throw new HttpError(502, "The AI grading service is temporarily unavailable.");
  }

  const raw = response.text;
  if (!raw) throw new HttpError(502, "The AI grading service returned an empty response.");

  const parsed = GradingResultSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new HttpError(502, "The AI grading service returned results in an unexpected format.");

  return parsed.data.grades;
}
