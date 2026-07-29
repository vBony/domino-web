import { SERVER_HTTP_URL } from "@config/serverUrl";

// Token mantido so em memoria (nunca localStorage/sessionStorage/cookie via
// JS) - ver decisao no plano: o servidor nao seta cookie HttpOnly nenhum
// hoje (so devolve { user, token } em JSON), entao a unica forma de nao
// guardar o token em storage do navegador e mante-lo vivo so enquanto a
// aba/app React estiver montada.
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Formato do express-validator .mapped(): { [campo]: { msg, ... } }.
interface ValidationErrorBody {
  errors: Record<string, { msg?: string }>;
}

function isValidationErrorBody(body: unknown): body is ValidationErrorBody {
  return typeof body === "object" && body !== null && "errors" in body;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  const response = await fetch(`${SERVER_HTTP_URL}${path}`, { ...init, headers });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isValidationErrorBody(body)) {
      const fieldErrors = Object.fromEntries(
        Object.entries(body.errors).map(([field, error]) => [field, error.msg ?? "Campo invalido"])
      );
      throw new ApiError("Dados invalidos", response.status, fieldErrors);
    }

    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : "Erro inesperado ao comunicar com o servidor";
    throw new ApiError(message, response.status);
  }

  return body as T;
}

export const apiClient = {
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", ...(data !== undefined ? { body: JSON.stringify(data) } : {}) }),
  get: <T>(path: string) => request<T>(path, { method: "GET" })
};
