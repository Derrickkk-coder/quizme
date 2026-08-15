import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export const apiClient = axios.create({ baseURL: API_BASE_URL });

const TOKEN_KEY = "quizme_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; details?: { message?: string }[] } | undefined;
    if (data?.details?.length) return data.details.map((d) => d.message).join(", ");
    if (data?.error) return data.error;
    if (error.message) return error.message;
  }
  return "Something went wrong. Please try again.";
}
