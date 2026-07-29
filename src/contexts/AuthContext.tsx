import { createContext, ReactNode, useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authService, LoginPayload, RegisterPayload } from "@services/authService";
import { setAuthToken, ApiError } from "@services/apiClient";
import { AuthUser } from "@/types/auth";

export type AuthStatus = "authenticated" | "unauthenticated";

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  loginAsGuest: (nickname?: string) => Promise<void>;
  logout: () => void;
  isPending: boolean;
  error: ApiError | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const ME_QUERY_KEY = ["auth", "me"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  // Sem persistencia de token (ver services/apiClient.ts): nao ha nada pra
  // recuperar no boot, entao o estado inicial ja e "unauthenticated" direto,
  // sem round-trip a /auth/me.
  const [user, setUser] = useState<AuthUser | null>(null);
  const queryClient = useQueryClient();

  const applySession = useCallback(
    (session: { user: AuthUser; token: string }) => {
      setAuthToken(session.token);
      setUser(session.user);
      queryClient.setQueryData(ME_QUERY_KEY, { user: session.user });
      void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
    [queryClient]
  );

  const loginMutation = useMutation({ mutationFn: authService.login, onSuccess: applySession });
  const registerMutation = useMutation({ mutationFn: authService.register, onSuccess: applySession });
  const guestMutation = useMutation({ mutationFn: authService.guest, onSuccess: applySession });

  const login = useCallback(
    async (payload: LoginPayload) => {
      await loginMutation.mutateAsync(payload);
    },
    [loginMutation]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      await registerMutation.mutateAsync(payload);
    },
    [registerMutation]
  );

  const loginAsGuest = useCallback(
    async (nickname?: string) => {
      await guestMutation.mutateAsync(nickname);
    },
    [guestMutation]
  );

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    queryClient.removeQueries({ queryKey: ME_QUERY_KEY });
  }, [queryClient]);

  const activeError = loginMutation.error ?? registerMutation.error ?? guestMutation.error ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status: user ? "authenticated" : "unauthenticated",
      login,
      register,
      loginAsGuest,
      logout,
      isPending: loginMutation.isPending || registerMutation.isPending || guestMutation.isPending,
      error: activeError instanceof ApiError ? activeError : null
    }),
    [
      user,
      login,
      register,
      loginAsGuest,
      logout,
      loginMutation.isPending,
      registerMutation.isPending,
      guestMutation.isPending,
      activeError
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
