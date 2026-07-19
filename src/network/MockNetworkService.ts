import { EventEmitter } from "@utils/EventEmitter";
import {
  NetworkService,
  MoveDTO,
  PieceDTO,
  TimerUpdateDTO,
  ChatMessageDTO,
  ReconnectDTO,
  RoomInfoDTO,
  PublicStateDTO,
  LocalIdentityDTO,
  MatchEndDTO,
  PassDTO
} from "./NetworkService";

interface MockNetworkEvents extends Record<string, unknown[]> {
  move: [MoveDTO];
  pass: [PassDTO];
  timer: [TimerUpdateDTO];
  chat: [ChatMessageDTO];
  reconnect: [ReconnectDTO];
  publicState: [PublicStateDTO];
  hand: [PieceDTO[]];
  matchEnd: [MatchEndDTO];
}

// Implementacao mockada do NetworkService, usada em LOCAL_MODE (ver
// GameManager) onde o proprio GameState local e a autoridade e nenhuma
// destas chamadas precisa produzir efeito real - so documentam onde a
// chamada Colyseus correspondente entraria.
export class MockNetworkService implements NetworkService {
  private readonly emitter = new EventEmitter<MockNetworkEvents>();

  async connect(): Promise<void> {
    console.info("[MockNetworkService] connect()");
  }

  async disconnect(): Promise<void> {
    console.info("[MockNetworkService] disconnect()");
  }

  async joinRoom(roomId: string, playerId: string): Promise<RoomInfoDTO> {
    console.info(`[MockNetworkService] joinRoom(${roomId}, ${playerId})`);
    return { roomId, playerIds: [playerId] };
  }

  async leaveRoom(roomId: string, playerId: string): Promise<void> {
    console.info(`[MockNetworkService] leaveRoom(${roomId}, ${playerId})`);
  }

  getLocalIdentity(): LocalIdentityDTO | null {
    return null;
  }

  async sendReady(): Promise<void> {
    console.info("[MockNetworkService] sendReady()");
  }

  async playPiece(move: MoveDTO): Promise<void> {
    console.info("[MockNetworkService] playPiece", move);
  }

  async drawPiece(playerId: string): Promise<PieceDTO> {
    console.info(`[MockNetworkService] drawPiece(${playerId})`);
    return { left: 0, right: 0 };
  }

  async passTurn(playerId: string): Promise<void> {
    console.info(`[MockNetworkService] passTurn(${playerId})`);
  }

  async sendChat(text: string): Promise<void> {
    console.info(`[MockNetworkService] sendChat(${text})`);
  }

  receivePublicState(handler: (state: PublicStateDTO) => void): () => void {
    this.emitter.on("publicState", handler);
    return () => this.emitter.off("publicState", handler);
  }

  receiveHand(handler: (hand: PieceDTO[]) => void): () => void {
    this.emitter.on("hand", handler);
    return () => this.emitter.off("hand", handler);
  }

  receiveMatchEnd(handler: (result: MatchEndDTO) => void): () => void {
    this.emitter.on("matchEnd", handler);
    return () => this.emitter.off("matchEnd", handler);
  }

  receiveMove(handler: (move: MoveDTO) => void): () => void {
    this.emitter.on("move", handler);
    return () => this.emitter.off("move", handler);
  }

  receivePass(handler: (payload: PassDTO) => void): () => void {
    this.emitter.on("pass", handler);
    return () => this.emitter.off("pass", handler);
  }

  receiveTimer(handler: (update: TimerUpdateDTO) => void): () => void {
    this.emitter.on("timer", handler);
    return () => this.emitter.off("timer", handler);
  }

  receiveChat(handler: (message: ChatMessageDTO) => void): () => void {
    this.emitter.on("chat", handler);
    return () => this.emitter.off("chat", handler);
  }

  receiveReconnect(handler: (payload: ReconnectDTO) => void): () => void {
    this.emitter.on("reconnect", handler);
    return () => this.emitter.off("reconnect", handler);
  }
}
