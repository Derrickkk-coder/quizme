import { apiClient } from "./client";
import { Attempt, AttemptResult, Paginated, Quiz, QuizAttemptSummary, StudentPerformance } from "../types";

// ─── Quizzes ──────────────────────────────────────────────────────────

export interface StudentQuizzes {
  available: Quiz[];
  upcoming: Quiz[];
  completed: Quiz[];
}

export async function getStudentQuizzes(): Promise<StudentQuizzes> {
  const { data } = await apiClient.get("/student/quizzes");
  return data;
}

export async function getStudentQuiz(id: string): Promise<{ data: Quiz }> {
  const { data } = await apiClient.get(`/student/quizzes/${id}`);
  return data;
}

// ─── Attempts ─────────────────────────────────────────────────────────

export async function startAttempt(quizId: string): Promise<{ data: Attempt }> {
  const { data } = await apiClient.post("/student/attempts", { quizId });
  return data;
}

export async function getActiveAttempt(): Promise<{ data: Attempt | null }> {
  const { data } = await apiClient.get("/student/attempts/active");
  return data;
}

export async function getAttempt(id: string): Promise<{ data: Attempt }> {
  const { data } = await apiClient.get(`/student/attempts/${id}`);
  return data;
}

export async function saveAnswer(attemptId: string, questionId: string, selectedOptionIds: string[]): Promise<{ data: Attempt }> {
  const { data } = await apiClient.post(`/student/attempts/${attemptId}/answers`, { questionId, selectedOptionIds });
  return data;
}

export async function recordTabSwitch(attemptId: string): Promise<{ data: { tabSwitchCount: number } }> {
  const { data } = await apiClient.post(`/student/attempts/${attemptId}/tab-switch`);
  return data;
}

export async function submitAttempt(attemptId: string, tabSwitchCount?: number): Promise<{ data: AttemptResult }> {
  const { data } = await apiClient.post(`/student/attempts/${attemptId}/submit`, { tabSwitchCount });
  return data;
}

// ─── Performance ──────────────────────────────────────────────────────

export async function getStudentPerformanceSummary(): Promise<{ data: StudentPerformance }> {
  const { data } = await apiClient.get("/student/performance/summary");
  return data;
}

export async function getStudentResults(page = 1, pageSize = 20): Promise<Paginated<QuizAttemptSummary>> {
  const { data } = await apiClient.get("/student/performance/results", { params: { page, pageSize } });
  return data;
}
