import { apiClient } from "./client";
import { triggerBlobDownload } from "../utils/download";
import {
  AcademicYear,
  Difficulty,
  Paginated,
  Question,
  QuestionType,
  Quiz,
  QuizAnalytics,
  QuizAttemptSummary,
  QuizStatus,
  SchoolClass,
  StudentPerformance,
  StudentProfile,
  Subject,
} from "../types";

// ─── Meta ─────────────────────────────────────────────────────────────

export async function getTeacherClasses(): Promise<{ data: SchoolClass[] }> {
  const { data } = await apiClient.get("/teacher/classes");
  return data;
}

export async function getTeacherSubjects(): Promise<{ data: Subject[] }> {
  const { data } = await apiClient.get("/teacher/subjects");
  return data;
}

export async function getTeacherStudents(classId?: string): Promise<{ data: (StudentProfile & { user: { name: string } })[] }> {
  const { data } = await apiClient.get("/teacher/students", { params: { classId } });
  return data;
}

export async function getTeacherTerms(): Promise<{ data: AcademicYear[] }> {
  const { data } = await apiClient.get("/teacher/terms");
  return data;
}

// ─── Question bank ────────────────────────────────────────────────────

export interface ListQuestionsParams {
  page?: number;
  pageSize?: number;
  subjectId?: string;
  classId?: string;
  topic?: string;
  difficulty?: Difficulty;
  search?: string;
}

export async function listQuestions(params: ListQuestionsParams): Promise<Paginated<Question>> {
  const { data } = await apiClient.get("/teacher/questions", { params });
  return data;
}

export async function getQuestionTopics(): Promise<{ data: string[] }> {
  const { data } = await apiClient.get("/teacher/questions/topics");
  return data;
}

export interface QuestionPayload {
  subjectId: string;
  classId?: string;
  topic: string;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  marks: number;
  explanation?: string;
  modelAnswer?: string;
  options: { text: string; isCorrect: boolean }[];
}

export async function createQuestion(payload: QuestionPayload): Promise<{ data: Question }> {
  const { data } = await apiClient.post("/teacher/questions", payload);
  return data;
}

export async function updateQuestion(id: string, payload: Partial<QuestionPayload>): Promise<{ data: Question }> {
  const { data } = await apiClient.patch(`/teacher/questions/${id}`, payload);
  return data;
}

export async function deleteQuestion(id: string): Promise<void> {
  await apiClient.delete(`/teacher/questions/${id}`);
}

export interface BulkDeleteQuestionsResult {
  deletedCount: number;
  skipped: { id: string; text: string }[];
}

export async function bulkDeleteQuestions(questionIds: string[]): Promise<{ data: BulkDeleteQuestionsResult }> {
  const { data } = await apiClient.post("/teacher/questions/bulk-delete", { questionIds });
  return data;
}

export interface BulkImportRow {
  topic: string;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  marks: number;
  explanation?: string;
  options: { text: string; isCorrect: boolean }[];
}

export interface BulkImportQuestionsResult {
  createdCount: number;
  errors: { row: number; reason: string }[];
}

export async function bulkImportQuestions(payload: {
  subjectId: string;
  classId?: string;
  questions: BulkImportRow[];
}): Promise<{ data: BulkImportQuestionsResult }> {
  const { data } = await apiClient.post("/teacher/questions/bulk-import", payload);
  return data;
}

// ─── AI question generation ─────────────────────────────────────────────

export interface GeneratedQuestion {
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  explanation: string;
  options: { text: string; isCorrect: boolean }[];
}

export interface GenerateQuestionsPayload {
  notes: string;
  count: number;
  difficulty: Difficulty | "MIXED";
  questionType: QuestionType | "MIXED";
  topic?: string;
}

export async function generateQuestionsFromNotes(payload: GenerateQuestionsPayload): Promise<{ data: GeneratedQuestion[] }> {
  const { data } = await apiClient.post("/teacher/ai/generate-questions", payload);
  return data;
}

export interface SaveGeneratedQuestionsPayload {
  subjectId: string;
  classId?: string;
  topic: string;
  questions: GeneratedQuestion[];
}

export async function saveGeneratedQuestions(payload: SaveGeneratedQuestionsPayload): Promise<{ data: Question[] }> {
  const { data } = await apiClient.post("/teacher/ai/save-questions", payload);
  return data;
}

// ─── Quizzes ───────────────────────────────────────────────────────────

export interface ListQuizzesParams {
  page?: number;
  pageSize?: number;
  status?: QuizStatus;
  subjectId?: string;
  classId?: string;
  search?: string;
}

export async function listTeacherQuizzes(params: ListQuizzesParams): Promise<Paginated<Quiz>> {
  const { data } = await apiClient.get("/teacher/quizzes", { params });
  return data;
}

export async function getTeacherQuiz(id: string): Promise<{ data: Quiz }> {
  const { data } = await apiClient.get(`/teacher/quizzes/${id}`);
  return data;
}

export interface QuizPayload {
  title: string;
  description?: string;
  instructions?: string;
  subjectId: string;
  classId: string;
  termId?: string;
  durationMinutes: number;
  passingScore: number;
  difficulty: Difficulty;
  opensAt?: string;
  closesAt?: string;
  maxAttempts: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  showResultsImmediately: boolean;
}

export async function createQuiz(payload: QuizPayload): Promise<{ data: Quiz }> {
  const { data } = await apiClient.post("/teacher/quizzes", payload);
  return data;
}

export async function updateQuiz(id: string, payload: Partial<QuizPayload>): Promise<{ data: Quiz }> {
  const { data } = await apiClient.patch(`/teacher/quizzes/${id}`, payload);
  return data;
}

export async function deleteQuiz(id: string): Promise<void> {
  await apiClient.delete(`/teacher/quizzes/${id}`);
}

export async function duplicateQuiz(id: string): Promise<{ data: Quiz }> {
  const { data } = await apiClient.post(`/teacher/quizzes/${id}/duplicate`);
  return data;
}

export async function publishQuiz(id: string): Promise<{ data: Quiz }> {
  const { data } = await apiClient.post(`/teacher/quizzes/${id}/publish`);
  return data;
}

export async function unpublishQuiz(id: string): Promise<{ data: Quiz }> {
  const { data } = await apiClient.post(`/teacher/quizzes/${id}/unpublish`);
  return data;
}

export async function closeQuiz(id: string): Promise<{ data: Quiz }> {
  const { data } = await apiClient.post(`/teacher/quizzes/${id}/close`);
  return data;
}

export async function addQuestionsToQuiz(quizId: string, questionIds: string[]): Promise<{ data: Quiz }> {
  const { data } = await apiClient.post(`/teacher/quizzes/${quizId}/questions`, { questionIds });
  return data;
}

export async function removeQuestionFromQuiz(quizId: string, quizQuestionId: string): Promise<{ data: Quiz }> {
  const { data } = await apiClient.delete(`/teacher/quizzes/${quizId}/questions/${quizQuestionId}`);
  return data;
}

export async function reorderQuizQuestions(quizId: string, quizQuestionIds: string[]): Promise<{ data: Quiz }> {
  const { data } = await apiClient.patch(`/teacher/quizzes/${quizId}/questions/reorder`, { quizQuestionIds });
  return data;
}

export interface AutoGenerateParams {
  subjectId: string;
  classId?: string;
  topic?: string;
  difficulty?: Difficulty;
  count: number;
}

export async function autoGenerateQuizQuestions(
  quizId: string,
  params: AutoGenerateParams
): Promise<{ data: Quiz; meta: { requested: number; added: number; available: number } }> {
  const { data } = await apiClient.post(`/teacher/quizzes/${quizId}/questions/auto-generate`, params);
  return data;
}

// ─── Results ──────────────────────────────────────────────────────────

export interface ListResultsParams {
  page?: number;
  pageSize?: number;
  quizId?: string;
  classId?: string;
  studentId?: string;
  pendingReview?: boolean;
}

export async function listTeacherResults(params: ListResultsParams): Promise<Paginated<QuizAttemptSummary>> {
  const { data } = await apiClient.get("/teacher/results", { params });
  return data;
}

export async function getTeacherResult(attemptId: string): Promise<{ data: QuizAttemptSummary & { answers: any[] } }> {
  const { data } = await apiClient.get(`/teacher/results/${attemptId}`);
  return data;
}

export async function sendResultFeedback(attemptId: string, teacherFeedback: string): Promise<void> {
  await apiClient.patch(`/teacher/results/${attemptId}/feedback`, { teacherFeedback });
}

export async function gradeShortAnswer(
  attemptId: string,
  answerId: string,
  payload: { marksAwarded: number; teacherNote?: string }
): Promise<{ data: QuizAttemptSummary & { answers: any[] } }> {
  const { data } = await apiClient.patch(`/teacher/results/${attemptId}/answers/${answerId}/grade`, payload);
  return data;
}

export async function downloadTeacherResultsCsv(params: Record<string, string | undefined>, filename = "results.csv"): Promise<void> {
  const { data } = await apiClient.get("/teacher/results/export.csv", { params, responseType: "blob" });
  triggerBlobDownload(data, filename);
}

// ─── Analytics ────────────────────────────────────────────────────────

export async function getTeacherOverview(): Promise<{ data: { quizCount: number; questionCount: number; classCount: number; attemptCount: number } }> {
  const { data } = await apiClient.get("/teacher/analytics/overview");
  return data;
}

export async function getQuizAnalytics(quizId: string): Promise<{ data: QuizAnalytics }> {
  const { data } = await apiClient.get(`/teacher/analytics/quiz/${quizId}`);
  return data;
}

export async function getStudentAnalytics(studentId: string): Promise<{ data: StudentPerformance }> {
  const { data } = await apiClient.get(`/teacher/analytics/student/${studentId}`);
  return data;
}
