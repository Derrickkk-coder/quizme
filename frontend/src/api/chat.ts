import { apiClient } from "./client";
import { ChatGroup, ChatMessage, Role } from "../types";

function basePath(role: Role): string {
  return role === "TEACHER" ? "/teacher/chat" : "/student/chat";
}

export async function listChatGroups(role: Role): Promise<{ data: ChatGroup[] }> {
  const { data } = await apiClient.get(`${basePath(role)}/groups`);
  return data;
}

export async function getChatMessages(role: Role, groupId: string, before?: string): Promise<{ data: ChatMessage[] }> {
  const { data } = await apiClient.get(`${basePath(role)}/groups/${groupId}/messages`, { params: { before } });
  return data;
}

export async function sendChatMessage(role: Role, groupId: string, text: string): Promise<{ data: ChatMessage }> {
  const { data } = await apiClient.post(`${basePath(role)}/groups/${groupId}/messages`, { text });
  return data;
}

export async function markChatGroupRead(role: Role, groupId: string): Promise<void> {
  await apiClient.post(`${basePath(role)}/groups/${groupId}/read`);
}

export async function createChatGroup(subjectId: string, classId: string): Promise<{ data: ChatGroup }> {
  const { data } = await apiClient.post("/teacher/chat/groups", { subjectId, classId });
  return data;
}

export async function deleteChatGroup(groupId: string): Promise<void> {
  await apiClient.delete(`/teacher/chat/groups/${groupId}`);
}
