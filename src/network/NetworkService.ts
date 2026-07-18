import { MoveSide } from "@engine/MoveValidator";

// DTOs: dados primitivos e serializaveis, nunca instancias de classes da
// engine. Esta e a fronteira que futuramente sera JSON trafegando via
// Socket.IO, entao nada aqui pode carregar comportamento, so dados.
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

export interface RoomInfoDTO {
  roomId: string;
  playerIds: string[];
}

// Contrato de comunicacao com o backend (Laravel + Express + Socket.IO,
// futuramente). Hoje so existe a MockNetworkService implementando isso -
// nenhum metodo aqui fala com um socket de verdade ainda.
export interface NetworkService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  joinRoom(roomId: string, playerId: string): Promise<RoomInfoDTO>;
  leaveRoom(roomId: string, playerId: string): Promise<void>;

  playPiece(move: MoveDTO): Promise<void>;
  drawPiece(playerId: string): Promise<PieceDTO>;
  passTurn(playerId: string): Promise<void>;

  // Cada receive* registra um handler para eventos vindos do servidor e
  // retorna uma funcao de unsubscribe.
  receiveMove(handler: (move: MoveDTO) => void): () => void;
  receiveTimer(handler: (update: TimerUpdateDTO) => void): () => void;
  receiveChat(handler: (message: ChatMessageDTO) => void): () => void;
  receiveReconnect(handler: (payload: ReconnectDTO) => void): () => void;
}
