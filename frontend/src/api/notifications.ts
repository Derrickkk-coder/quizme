import { apiClient } from "./client";
import { AppNotification, Paginated } from "../types";

export async function listNotifications(page = 1, pageSize = 20): Promise<Paginated<AppNotification> & { unreadCount: number }> {
  const { data } = await apiClient.get(`/notifications`, { params: { page, pageSize } });
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post(`/notifications/read-all`);
}
