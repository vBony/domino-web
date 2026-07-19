import { Client, Room } from "colyseus.js";
import { DominoPiece } from "@engine/DominoPiece";
import { MoveSide } from "@engine/MoveValidator";
import { SERVER_HTTP_URL, SERVER_WS_URL } from "@config/serverUrl";
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
  PublicPlayerDTO,
  LocalIdentityDTO,
  MatchEndDTO,
  PassDTO
} from "./NetworkService";

interface ColyseusNetworkEvents extends Record<string, unknown[]> {
  move: [MoveDTO];
  pass: [PassDTO];
  timer: [TimerUpdateDTO];
  chat: [ChatMessageDTO];
  reconnect: [ReconnectDTO];
  publicState: [PublicStateDTO];
  hand: [PieceDTO[]];
  matchEnd: [MatchEndDTO];
}

interface RawPlayer {
  id: string;
  username: string;
  seat: number;
  team: number;
  score: number;
  ready: boolean;
  connected: boolean;
  tilesCount: number;
}

interface RawTile {
  id: string;
  left: number;
  right: number;
  playedBySeat: number;
}

interface RawState {
  gameId: string;
  status: PublicStateDTO["status"];
  players: Iterable<RawPlayer>;
  board: Iterable<RawTile>;
  currentTurn: string;
  turnNumber: number;
  remainingTiles: number;
  scoreTeamA: number;
  scoreTeamB: number;
  winningTeam: number;
}

interface TilePlayedMessage {
  playerId: string;
  left: number;
  right: number;
  side: MoveSide;
}

const ROOM_NAME = "domino";

// Implementacao real do NetworkService: fala com o domino-server via
// Colyseus. O servidor e a unica fonte de verdade - este service so
// encaminha intencoes (playPiece/passTurn/...) e traduz o que o servidor
// confirma de volta para os DTOs que o resto do client entende. Nunca
// valida jogada aqui, e nunca envia uma peca completa - so o tileId
// (identico ao DominoPiece.id local, ja que ambos derivam de min-max).
export class ColyseusNetworkService implements NetworkService {
  private readonly emitter = new EventEmitter<ColyseusNetworkEvents>();
  private readonly client: Client;
  private room: Room<RawState> | null = null;
  private identity: LocalIdentityDTO | null = null;
  private guestUsername = "";

  constructor(private readonly nicknameHint?: string) {
    this.client = new Client(SERVER_WS_URL);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async connect(): Promise<void> {}

  async disconnect(): Promise<void> {
    await this.room?.leave();
    this.room = null;
  }

  async joinRoom(_roomId: string, _playerId: string): Promise<RoomInfoDTO> {
    const token = await this.guestLogin();
    const room = await this.client.joinOrCreate<RawState>(ROOM_NAME, { token });
    this.room = room;

    room.onMessage("hand_update", (msg: { hand: PieceDTO[] }) => {
      this.emitter.emit("hand", msg.hand);
    });
    room.onMessage("tile_played", (msg: TilePlayedMessage) => {
      this.emitter.emit("move", {
        playerId: msg.playerId,
        piece: { left: msg.left, right: msg.right },
        side: msg.side
      });
    });
    room.onMessage("invalid_move", (msg: { reason: string }) => {
      console.warn("[ColyseusNetworkService] invalid_move:", msg.reason);
    });
    room.onMessage("player_passed", (msg: PassDTO) => {
      this.emitter.emit("pass", msg);
    });
    room.onMessage("game_finished", (msg: MatchEndDTO) => {
      this.emitter.emit("matchEnd", msg);
    });

    room.onStateChange((state) => this.handleStateChange(state));

    this.identity = { id: room.sessionId, username: this.guestUsername };

    // Espera o primeiro snapshot de estado publico chegar antes de resolver
    // o join, para quem chama ja receber a lista de jogadores atual.
    const firstState = await this.waitFirstState();

    return { roomId: room.roomId, playerIds: firstState.players.map((p) => p.id) };
  }

  async leaveRoom(): Promise<void> {
    await this.room?.leave();
  }

  getLocalIdentity(): LocalIdentityDTO | null {
    return this.identity;
  }

  async sendReady(): Promise<void> {
    this.room?.send("player_ready");
  }

  async playPiece(move: MoveDTO): Promise<void> {
    const tileId = new DominoPiece(move.piece.left, move.piece.right).id;
    this.room?.send("play_tile", { tileId, side: move.side });
  }

  async drawPiece(_playerId: string): Promise<PieceDTO> {
    // Em partidas de 4 jogadores o servidor sempre rejeita (nao ha monte -
    // ver DominoRoom.handleDrawTile). Existe so para atender o protocolo.
    this.room?.send("draw_tile");
    return { left: 0, right: 0 };
  }

  async passTurn(): Promise<void> {
    this.room?.send("pass_turn");
  }

  async sendChat(text: string): Promise<void> {
    // Protocolo de chat ainda nao existe no servidor - fica para uma
    // proxima rodada.
    console.info("[ColyseusNetworkService] sendChat (sem suporte no servidor ainda):", text);
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

  private async guestLogin(): Promise<string> {
    const response = await fetch(`${SERVER_HTTP_URL}/auth/guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.nicknameHint ? { nickname: this.nicknameHint } : {})
    });
    if (!response.ok) throw new Error("Falha ao autenticar como convidado");

    const data = (await response.json()) as { user: { nickname: string }; token: string };
    this.guestUsername = data.user.nickname;
    return data.token;
  }

  private toPublicState(state: RawState): PublicStateDTO {
    return {
      gameId: state.gameId,
      status: state.status,
      players: Array.from(state.players).map(
        (p): PublicPlayerDTO => ({
          id: p.id,
          username: p.username,
          seat: p.seat,
          team: p.team,
          score: p.score,
          ready: p.ready,
          connected: p.connected,
          tilesCount: p.tilesCount
        })
      ),
      board: Array.from(state.board).map((t): PieceDTO => ({ left: t.left, right: t.right })),
      currentTurn: state.currentTurn,
      turnNumber: state.turnNumber,
      remainingTiles: state.remainingTiles,
      scoreTeamA: state.scoreTeamA,
      scoreTeamB: state.scoreTeamB,
      winningTeam: state.winningTeam
    };
  }

  private handleStateChange(state: RawState): void {
    this.emitter.emit("publicState", this.toPublicState(state));
  }

  private waitFirstState(): Promise<PublicStateDTO> {
    return new Promise((resolve) => {
      const unsubscribe = this.receivePublicState((state) => {
        unsubscribe();
        resolve(state);
      });
    });
  }
}
