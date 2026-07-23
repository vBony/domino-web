// Tipos do resultado de uma rodada. A classificacao em si (quem venceu, por
// que tipo de vitoria) e decidida so pelo servidor autoritativo
// (domino-server/src/game/DominoRules.classifyHandEmptyWin) - este modulo
// so espelha o vocabulario (WinReason/pontos) pra GameManager/TableScene
// montarem o RoundResult a partir do que o servidor manda (ver
// GameManager.handleRemoteMatchEnd).

// Classificacao da vitoria por mao vazia, do maior para o menor bonus. So
// uma se aplica por vitoria (a primeira que bater, na ordem abaixo) - mesma
// regra e mesma prioridade do domino-server:
//
// 1. "gabuada" (25 pts): o vencedor jogou uma pedra comum que fechou uma
//    ponta com o mesmo numero da bucha que guardava na mao, isso forcou
//    passe geral (os outros 3 assentos passam em sequencia), e na volta do
//    turno ele bate com a propria bucha.
// 2. "double-ended" (15 pts): a ultima pedra encaixava nas duas pontas
//    abertas no momento da jogada (independente de qual lado foi escolhido).
// 3. "double" (15 pts, mesmo valor de "double-ended"): a ultima pedra e um
//    duplo, sem se encaixar forcosamente nas duas pontas.
// 4. "common" (10 pts): qualquer outra vitoria por mao vazia.
export type WinReason = "gabuada" | "double-ended" | "double" | "common";

export const WIN_BONUS_POINTS: Record<WinReason, number> = {
  gabuada: 25,
  "double-ended": 15,
  double: 15,
  common: 10
};

export interface RoundResult {
  winnerId: string | null;
  scoreByPlayer: Map<string, number>;
  reason: "hand-empty" | "blocked";
  winKind: WinReason | null;
}
