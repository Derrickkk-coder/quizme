import { apiClient } from "./client";
import { User } from "../types";

export interface LoginResponse {
  token: string;
  user: User;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/auth/login", { email, password });
  return data;
}

export async function fetchMe(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me");
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post("/auth/change-password", { currentPassword, newPassword });
}
