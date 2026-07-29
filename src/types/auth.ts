// DTOs espelhando exatamente o que domino-server/src/controllers/authController.ts
// devolve hoje (toUserDTO): so id e nickname, nunca senha/hash.
export interface AuthUser {
  id: string;
  nickname: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface MeResponse {
  user: AuthUser;
}
