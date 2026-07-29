import { apiClient } from "@services/apiClient";
import { AuthResponse, MeResponse } from "@/types/auth";

export interface RegisterPayload {
  nickname: string;
  password: string;
}

export interface LoginPayload {
  nickname: string;
  password: string;
}

export const authService = {
  register: (payload: RegisterPayload) => apiClient.post<AuthResponse>("/auth/register", payload),
  login: (payload: LoginPayload) => apiClient.post<AuthResponse>("/auth/login", payload),
  guest: (nickname?: string) =>
    apiClient.post<AuthResponse>("/auth/guest", nickname ? { nickname } : undefined),
  me: () => apiClient.get<MeResponse>("/auth/me")
};
