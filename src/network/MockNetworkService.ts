import { EventEmitter } from "@utils/EventEmitter";
import {
  NetworkService,
  MoveDTO,
  PieceDTO,
  TimerUpdateDTO,
  ChatMessageDTO,
  ReconnectDTO,
  RoomInfoDTO
} from "./NetworkService";

interface MockNetworkEvents extends Record<string, unknown[]> {
  move: [MoveDTO];
  timer: [TimerUpdateDTO];
  chat: [ChatMessageDTO];
  reconnect: [ReconnectDTO];
}

// Implementacao mockada do NetworkService, usada enquanto nao ha backend
// real. Cada metodo indica, em comentario, onde a chamada Socket.IO
// correspondente entrara quando a integracao acontecer.
export class MockNetworkService implements NetworkService {
  private readonly emitter = new EventEmitter<MockNetworkEvents>();

  async connect(): Promise<void> {
    // Integracao futura: abrir conexao real, ex. this.socket = io(SERVER_URL).
    console.info("[MockNetworkService] connect()");
  }

  async disconnect(): Promise<void> {
    // Integracao futura: this.socket.disconnect().
    console.info("[MockNetworkService] disconnect()");
  }

  async joinRoom(roomId: string, playerId: string): Promise<RoomInfoDTO> {
    // Integracao futura: this.socket.emit("joinRoom", { roomId, playerId }) e aguardar ack do servidor.
    console.info(`[MockNetworkService] joinRoom(${roomId}, ${playerId})`);
    return { roomId, playerIds: [playerId] };
  }

  async leaveRoom(roomId: string, playerId: string): Promise<void> {
    // Integracao futura: this.socket.emit("leaveRoom", { roomId, playerId }).
    console.info(`[MockNetworkService] leaveRoom(${roomId}, ${playerId})`);
  }

  async playPiece(move: MoveDTO): Promise<void> {
    // Integracao futura: this.socket.emit("playPiece", move); o servidor
    // valida e redistribui a jogada para todos via receiveMove().
    console.info("[MockNetworkService] playPiece", move);
  }

  async drawPiece(playerId: string): Promise<PieceDTO> {
    // Integracao futura: this.socket.emit("drawPiece", { playerId }) e aguardar a peca sorteada pelo servidor.
    console.info(`[MockNetworkService] drawPiece(${playerId})`);
    return { left: 0, right: 0 };
  }

  async passTurn(playerId: string): Promise<void> {
    // Integracao futura: this.socket.emit("passTurn", { playerId }).
    console.info(`[MockNetworkService] passTurn(${playerId})`);
  }

  receiveMove(handler: (move: MoveDTO) => void): () => void {
    // Integracao futura: this.socket.on("move", handler).
    this.emitter.on("move", handler);
    return () => this.emitter.off("move", handler);
  }

  receiveTimer(handler: (update: TimerUpdateDTO) => void): () => void {
    // Integracao futura: this.socket.on("timer", handler).
    this.emitter.on("timer", handler);
    return () => this.emitter.off("timer", handler);
  }

  receiveChat(handler: (message: ChatMessageDTO) => void): () => void {
    // Integracao futura: this.socket.on("chat", handler).
    this.emitter.on("chat", handler);
    return () => this.emitter.off("chat", handler);
  }

  receiveReconnect(handler: (payload: ReconnectDTO) => void): () => void {
    // Integracao futura: this.socket.on("reconnect", handler).
    this.emitter.on("reconnect", handler);
    return () => this.emitter.off("reconnect", handler);
  }
}
