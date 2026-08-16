import { apiClient } from "./client";
import {
  AcademicYear,
  AdminDashboardData,
  AuditLogEntry,
  GradeBand,
  Paginated,
  Quiz,
  QuizStatus,
  Role,
  SchoolClass,
  Subject,
  Term,
  User,
} from "../types";

// ─── Dashboard ────────────────────────────────────────────────────────

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const { data } = await apiClient.get("/admin/dashboard");
  return data;
}

// ─── Users ────────────────────────────────────────────────────────────

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  role?: Role;
  search?: string;
  classId?: string;
  isActive?: boolean;
}

export async function listUsers(params: ListUsersParams): Promise<Paginated<User>> {
  const { data } = await apiClient.get("/admin/users", { params });
  return data;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  role: Role;
  classId?: string;
}

export async function createUser(payload: CreateUserPayload): Promise<{ user: User; tempPassword: string }> {
  const { data } = await apiClient.post("/admin/users", payload);
  return data;
}

export async function updateUser(
  id: string,
  payload: Partial<{ name: string; email: string; classId: string | null; isActive: boolean }>
): Promise<{ user: User }> {
  const { data } = await apiClient.patch(`/admin/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/admin/users/${id}`);
}

export async function resetUserPassword(id: string): Promise<{ tempPassword: string }> {
  const { data } = await apiClient.post(`/admin/users/${id}/reset-password`);
  return data;
}

// ─── Classes ──────────────────────────────────────────────────────────

export async function listClasses(): Promise<{ data: SchoolClass[] }> {
  const { data } = await apiClient.get("/admin/classes");
  return data;
}

export async function createClass(payload: { name: string; level?: string }): Promise<{ data: SchoolClass }> {
  const { data } = await apiClient.post("/admin/classes", payload);
  return data;
}

export async function updateClass(id: string, payload: Partial<{ name: string; level: string }>): Promise<{ data: SchoolClass }> {
  const { data } = await apiClient.patch(`/admin/classes/${id}`, payload);
  return data;
}

export async function deleteClass(id: string): Promise<void> {
  await apiClient.delete(`/admin/classes/${id}`);
}

// ─── Subjects ─────────────────────────────────────────────────────────

export async function listSubjects(): Promise<{ data: Subject[] }> {
  const { data } = await apiClient.get("/admin/subjects");
  return data;
}

export async function createSubject(payload: { name: string; code?: string }): Promise<{ data: Subject }> {
  const { data } = await apiClient.post("/admin/subjects", payload);
  return data;
}

export async function updateSubject(id: string, payload: Partial<{ name: string; code: string }>): Promise<{ data: Subject }> {
  const { data } = await apiClient.patch(`/admin/subjects/${id}`, payload);
  return data;
}

export async function deleteSubject(id: string): Promise<void> {
  await apiClient.delete(`/admin/subjects/${id}`);
}

export async function assignTeacherToSubject(subjectId: string, teacherId: string, classId: string) {
  const { data } = await apiClient.post(`/admin/subjects/${subjectId}/assignments`, { teacherId, classId });
  return data;
}

export async function removeAssignment(assignmentId: string): Promise<void> {
  await apiClient.delete(`/admin/subjects/assignments/${assignmentId}`);
}

// ─── Quizzes (read-only, school-wide) ──────────────────────────────────

export interface ListAdminQuizzesParams {
  page?: number;
  pageSize?: number;
  status?: QuizStatus;
  subjectId?: string;
  classId?: string;
  search?: string;
}

export async function listAdminQuizzes(params: ListAdminQuizzesParams): Promise<Paginated<Quiz>> {
  const { data } = await apiClient.get("/admin/quizzes", { params });
  return data;
}

// ─── Settings ─────────────────────────────────────────────────────────

export async function getGradeBands(): Promise<{ data: GradeBand[] }> {
  const { data } = await apiClient.get("/admin/settings/grade-bands");
  return data;
}

export async function saveGradeBands(bands: GradeBand[]): Promise<{ data: GradeBand[] }> {
  const { data } = await apiClient.put("/admin/settings/grade-bands", bands);
  return data;
}

// ─── Academic years & terms ──────────────────────────────────────────

export async function listAcademicYears(): Promise<{ data: AcademicYear[] }> {
  const { data } = await apiClient.get("/admin/settings/academic-years");
  return data;
}

export interface AcademicYearPayload {
  name: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

export async function createAcademicYear(payload: AcademicYearPayload): Promise<{ data: AcademicYear }> {
  const { data } = await apiClient.post("/admin/settings/academic-years", payload);
  return data;
}

export async function updateAcademicYear(id: string, payload: Partial<AcademicYearPayload>): Promise<{ data: AcademicYear }> {
  const { data } = await apiClient.patch(`/admin/settings/academic-years/${id}`, payload);
  return data;
}

export async function deleteAcademicYear(id: string): Promise<void> {
  await apiClient.delete(`/admin/settings/academic-years/${id}`);
}

export interface TermPayload {
  academicYearId: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

export async function createTerm(payload: TermPayload): Promise<{ data: Term }> {
  const { data } = await apiClient.post("/admin/settings/terms", payload);
  return data;
}

export async function updateTerm(id: string, payload: Partial<Omit<TermPayload, "academicYearId">>): Promise<{ data: Term }> {
  const { data } = await apiClient.patch(`/admin/settings/terms/${id}`, payload);
  return data;
}

export async function deleteTerm(id: string): Promise<void> {
  await apiClient.delete(`/admin/settings/terms/${id}`);
}

// ─── Audit logs ───────────────────────────────────────────────────────

export interface ListAuditParams {
  page?: number;
  pageSize?: number;
  action?: string;
  entityType?: string;
}

export async function listAuditLogs(params: ListAuditParams): Promise<Paginated<AuditLogEntry>> {
  const { data } = await apiClient.get("/admin/audit-logs", { params });
  return data;
}

// ─── Reports ──────────────────────────────────────────────────────────

import { triggerBlobDownload } from "../utils/download";

export async function downloadResultsCsv(params: Record<string, string | undefined>, filename = "school-results.csv"): Promise<void> {
  const { data } = await apiClient.get("/admin/reports/results.csv", { params, responseType: "blob" });
  triggerBlobDownload(data, filename);
}

export async function downloadUsersCsv(filename = "users.csv"): Promise<void> {
  const { data } = await apiClient.get("/admin/reports/users.csv", { responseType: "blob" });
  triggerBlobDownload(data, filename);
}
