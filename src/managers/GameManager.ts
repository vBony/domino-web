import { MoveSide } from "@engine/MoveValidator";
import { RemoteGameView } from "@engine/RemoteGameView";
import { RoundResult, WIN_BONUS_POINTS } from "@engine/WinnerCalculator";
import { NetworkService, MatchEndDTO, PieceDTO, PublicStateDTO } from "@network/NetworkService";
import { TimerService } from "@services/TimerService";
import { EventEmitter } from "@utils/EventEmitter";

// Historico cru de eventos da partida (quem jogou o que, quem passou,
// quando comecou). TableScene traduz isso em texto (com nomes) para a
// timeline - GameManager so sabe playerIds, nao nomes de exibicao.
export type TimelineEvent =
  | { type: "match_started" }
  | { type: "tile_played"; playerId: string; piece: PieceDTO; side: MoveSide }
  | { type: "turn_passed"; playerId: string };

export interface GameManagerEvents extends Record<string, unknown[]> {
  stateChanged: [];
  roundEnded: [RoundResult];
  matchEnded: [string | null];
  timelineEvent: [TimelineEvent];
  invalidMove: [string];
}

// Orquestrador de mais alto nivel do modo online: NENHUMA regra e decidida
// aqui - `remoteView` so espelha o que o servidor (DominoRoom) confirma via
// NetworkService. playPiece/drawPiece/passTurn apenas enviam a intencao; o
// estado so muda quando receivePublicState/receiveHand disparam com a
// confirmacao do servidor (sem aplicacao otimista, pra nunca divergir do
// servidor autoritativo).
export class GameManager {
  readonly events = new EventEmitter<GameManagerEvents>();
  private readonly timerService: TimerService;
  private readonly remoteView = new RemoteGameView();

  private lastRemoteStatus: PublicStateDTO["status"] | null = null;
  private lastRemoteTurnNumber = 0;
  private lastRemoteCurrentPlayerId = "";
  private lastAutoPassedTurnNumber: number | null = null;
  private playingWaiters: Array<() => void> = [];

  constructor(
    private readonly networkService: NetworkService,
    private readonly localPlayerId: string,
    turnDurationMs = 60_000
  ) {
    this.timerService = new TimerService([], turnDurationMs);
    this.remoteView.setLocalPlayerId(localPlayerId);
    this.wireRemoteEvents();
  }

  // So avisa o servidor que este cliente esta pronto. A partida so comeca
  // de verdade (pecas distribuidas, status "playing") quando os 4
  // jogadores enviarem player_ready - ver DominoRoom.
  async startMatch(): Promise<void> {
    await this.networkService.sendReady();
    await this.waitUntilPlaying();
  }

  getCurrentGame(): RemoteGameView {
    return this.remoteView;
  }

  getTimerService(): TimerService {
    return this.timerService;
  }

  // Em quais lados (nenhum, um ou os dois) uma peca da mao pode ser jogada
  // agora. Usado pela camada visual para decidir se joga direto (so um
  // lado serve) ou se precisa perguntar ao jogador qual ponta usar (os
  // dois servem) - sem que a Scene precise conhecer regras do tabuleiro.
  getPlayableSides(playerId: string, pieceId: string): MoveSide[] {
    const sides: MoveSide[] = [];
    if (this.remoteView.canPlay(playerId, pieceId, "left")) sides.push("left");
    if (this.remoteView.canPlay(playerId, pieceId, "right")) sides.push("right");
    return sides;
  }

  // Valor exposto em cada ponta aberta do tabuleiro, pra UI mostrar ao
  // jogador o que cada escolha de lado realmente conecta. null = mesa
  // vazia (nenhuma ponta ainda).
  getOpenEndValues(): { left: number; right: number } | null {
    const board = this.remoteView.getBoard();
    if (board.length === 0) return null;
    return { left: board[0]!.left, right: board[board.length - 1]!.right };
  }

  playPiece(playerId: string, pieceId: string, side: MoveSide): void {
    if (playerId !== this.localPlayerId) {
      throw new Error("Neste cliente, apenas o jogador local pode iniciar uma jogada");
    }

    const piece = this.remoteView
      .getHand(playerId)
      .getPieces()
      .find((candidate) => candidate.id === pieceId);
    if (!piece) {
      throw new Error(`Peca ${pieceId} nao encontrada na mao de ${playerId}`);
    }

    // Nao muta nada aqui. So aplica quando o servidor confirmar via
    // receivePublicState/receiveHand (ver wireRemoteEvents).
    void this.networkService.playPiece({
      playerId,
      piece: { left: piece.left, right: piece.right },
      side
    });
  }

  drawPiece(playerId: string): void {
    void this.networkService.drawPiece(playerId);
  }

  passTurn(playerId: string): void {
    void this.networkService.passTurn(playerId);
  }

  private hasAnyLegalMove(playerId: string): boolean {
    return this.remoteView
      .getHand(playerId)
      .getPieces()
      .some((piece) => this.remoteView.canPlay(playerId, piece.id, "left") || this.remoteView.canPlay(playerId, piece.id, "right"));
  }

  private wireRemoteEvents(): void {
    this.networkService.receivePublicState((state) => this.applyRemoteState(state));
    this.networkService.receiveHand((hand) => {
      this.remoteView.applyHand(this.localPlayerId, hand);
      this.events.emit("stateChanged");
      this.autoPassIfStuck();
    });
    this.networkService.receiveMove((move) => {
      this.events.emit("timelineEvent", { type: "tile_played", playerId: move.playerId, piece: move.piece, side: move.side });
    });
    this.networkService.receivePass((pass) => {
      this.events.emit("timelineEvent", { type: "turn_passed", playerId: pass.playerId });
    });
    this.networkService.receiveMatchEnd((result) => this.handleRemoteMatchEnd(result));
    this.networkService.receiveInvalidMove((payload) => this.events.emit("invalidMove", payload.reason));
  }

  private applyRemoteState(state: PublicStateDTO): void {
    this.remoteView.applyPublicState(
      state.players.map((player) => ({ id: player.id, seat: player.seat, tilesCount: player.tilesCount })),
      state.board,
      state.currentTurn,
      state.remainingTiles
    );

    if (state.status === "playing" && this.lastRemoteStatus !== "playing") {
      this.playingWaiters.forEach((resolve) => resolve());
      this.playingWaiters = [];
      this.events.emit("timelineEvent", { type: "match_started" });
    }
    this.lastRemoteStatus = state.status;
    this.lastRemoteTurnNumber = state.turnNumber;
    this.lastRemoteCurrentPlayerId = state.currentTurn;

    this.events.emit("stateChanged");
    this.autoPassIfStuck();
  }

  private waitUntilPlaying(): Promise<void> {
    if (this.lastRemoteStatus === "playing") return Promise.resolve();
    return new Promise((resolve) => this.playingWaiters.push(resolve));
  }

  // Regra do dominó: quem não tem nenhuma jogada válida passa a vez
  // automaticamente (não é uma ação manual do jogador). Sem isso o turno
  // trava indefinidamente no jogador sem jogada. So pode disparar
  // pass_turn para o PROPRIO jogador local - o servidor e quem decide o
  // resto. Chamado tanto quando o estado publico muda quanto quando a mao
  // chega (hand_update), porque a ordem entre os dois nao e garantida: se
  // o estado bater "e meu turno" antes da mao carregar, a dedupe por
  // turnNumber deixa a checagem pendente ate a mao chegar (uma mao ainda
  // nao carregada teria 0 pecas, o que faria essa funcao pensar, errado,
  // que o jogador esta sem jogada).
  private autoPassIfStuck(): void {
    if (this.lastRemoteStatus !== "playing") return;
    if (this.lastAutoPassedTurnNumber === this.lastRemoteTurnNumber) return;
    if (this.lastRemoteCurrentPlayerId !== this.localPlayerId) return;

    const hand = this.remoteView.getHand(this.localPlayerId);
    if (hand.count() === 0) return;

    this.lastAutoPassedTurnNumber = this.lastRemoteTurnNumber;
    if (!this.hasAnyLegalMove(this.localPlayerId)) {
      void this.networkService.passTurn(this.localPlayerId);
    }
  }

  private handleRemoteMatchEnd(result: MatchEndDTO): void {
    const scoreByPlayer = new Map<string, number>();
    let winnerId: string | null = null;
    const points = result.winKind ? WIN_BONUS_POINTS[result.winKind] : 0;

    if (!result.isDraw) {
      this.remoteView.getPlayerIds().forEach((playerId, index) => {
        const team = index % 2; // seats 0/2 = time A, seats 1/3 = time B (ver DominoRules.teamOf no servidor)
        const won = team === result.winningTeam;
        scoreByPlayer.set(playerId, won ? points : 0);
        if (won && winnerId === null) winnerId = playerId;
      });
    } else {
      this.remoteView.getPlayerIds().forEach((playerId) => scoreByPlayer.set(playerId, 0));
    }

    this.timerService.stopAll();
    this.events.emit("roundEnded", { winnerId, scoreByPlayer, reason: result.reason, winKind: result.winKind });
    this.events.emit("matchEnded", winnerId);
  }
}
