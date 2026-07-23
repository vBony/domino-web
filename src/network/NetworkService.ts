import { MoveSide } from "@engine/MoveValidator";
import { WinReason } from "@engine/WinnerCalculator";

// DTOs: dados primitivos e serializaveis, nunca instancias de classes da
// engine. Esta e a fronteira que trafega via WebSocket (Colyseus), entao
// nada aqui pode carregar comportamento, so dados.
export interface PieceDTO {
  left: number;
  right: number;
}

export interface MoveDTO {
  playerId: string;
  piece: PieceDTO;
  side: MoveSide;
}

export interface TimerUpdateDTO {
  playerId: string;
  remainingMs: number;
}

export interface ChatMessageDTO {
  playerId: string;
  text: string;
  sentAt: number;
}

export interface ReconnectDTO {
  playerId: string;
  roomId: string;
}

export interface PassDTO {
  playerId: string;
}

export interface InvalidMoveDTO {
  reason: string;
}

export interface RoomInfoDTO {
  roomId: string;
  playerIds: string[];
}

export type MatchStatusDTO = "waiting" | "starting" | "playing" | "finished";

// Estado publico de um jogador, tal como o servidor autoritativo o expoe:
// NUNCA contem as pecas da mao, so a contagem (fog of war).
export interface PublicPlayerDTO {
  id: string;
  username: string;
  seat: number;
  team: number;
  score: number;
  ready: boolean;
  connected: boolean;
  tilesCount: number;
}

// Estado publico sincronizado da partida, espelhando o DominoState do
// servidor. Tudo aqui e seguro de exibir para qualquer jogador.
export interface PublicStateDTO {
  gameId: string;
  status: MatchStatusDTO;
  players: PublicPlayerDTO[];
  board: PieceDTO[];
  currentTurn: string;
  turnNumber: number;
  remainingTiles: number;
  scoreTeamA: number;
  scoreTeamB: number;
  winningTeam: number;
}

export interface LocalIdentityDTO {
  id: string;
  username: string;
}

export interface MatchEndDTO {
  // null = empate (jogo travado, ninguem vence a rodada).
  winningTeam: number | null;
  isDraw: boolean;
  reason: "hand-empty" | "blocked";
  // Tipo de vitoria (gabuada/double-ended/double/comum) - null quando empate.
  winKind: WinReason | null;
  scoreTeamA: number;
  scoreTeamB: number;
}

// Contrato de comunicacao com o backend autoritativo (Colyseus). Quem
// implementa isto NUNCA decide se uma jogada e valida - so encaminha
// intencoes e repassa o que o servidor confirmar.
export interface NetworkService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  joinRoom(roomId: string, playerId: string): Promise<RoomInfoDTO>;
  leaveRoom(roomId: string, playerId: string): Promise<void>;

  // Identidade atribuida pelo servidor apos o join (sessionId + username).
  // Retorna null antes de joinRoom() resolver.
  getLocalIdentity(): LocalIdentityDTO | null;

  sendReady(): Promise<void>;
  playPiece(move: MoveDTO): Promise<void>;
  drawPiece(playerId: string): Promise<PieceDTO>;
  passTurn(playerId: string): Promise<void>;
  sendChat(text: string): Promise<void>;

  // Cada receive* registra um handler para eventos vindos do servidor e
  // retorna uma funcao de unsubscribe.
  receivePublicState(handler: (state: PublicStateDTO) => void): () => void;
  receiveHand(handler: (hand: PieceDTO[]) => void): () => void;
  receiveMatchEnd(handler: (result: MatchEndDTO) => void): () => void;
  receiveMove(handler: (move: MoveDTO) => void): () => void;
  receivePass(handler: (payload: PassDTO) => void): () => void;
  receiveTimer(handler: (update: TimerUpdateDTO) => void): () => void;
  receiveChat(handler: (message: ChatMessageDTO) => void): () => void;
  receiveReconnect(handler: (payload: ReconnectDTO) => void): () => void;
  receiveInvalidMove(handler: (payload: InvalidMoveDTO) => void): () => void;
}
