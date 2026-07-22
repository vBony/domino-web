import { DominoPiece } from "@engine/DominoPiece";
import { Player } from "@engine/Player";
import { DominoRules } from "@engine/DominoRules";
import { MoveSide } from "@engine/MoveValidator";
import { GameView } from "@engine/GameView";
import { RemoteGameView } from "@engine/RemoteGameView";
import { Match, MatchConfig } from "@engine/Match";
import { RoundResult } from "@engine/WinnerCalculator";
import { NetworkService, MatchEndDTO, PieceDTO, PublicStateDTO } from "@network/NetworkService";
import { TimerService } from "@services/TimerService";
import { ReplayManager } from "@managers/ReplayManager";
import { EventEmitter } from "@utils/EventEmitter";
import { LOCAL_MODE } from "@config/localMode";

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

// Orquestrador de mais alto nivel: e o unico lugar onde LOCAL_MODE muda o
// comportamento de fato.
//
// Em modo local, `localMatch` e a autoridade: qualquer assento joga direto
// no GameState (para testar os 4 jogadores numa unica aba).
//
// Em modo online, NENHUMA regra e decidida aqui - `remoteView` so espelha
// o que o servidor (DominoRoom) confirma via NetworkService. playPiece/
// drawPiece/passTurn apenas enviam a intencao; o estado so muda quando
// receivePublicState/receiveHand disparam com a confirmacao do servidor.
export class GameManager {
  readonly events = new EventEmitter<GameManagerEvents>();
  private readonly replayManager = new ReplayManager();
  private readonly timerService: TimerService;

  private readonly localMatch: Match | null = null;
  private readonly remoteView: RemoteGameView | null = null;
  private currentGame: GameView | null = null;

  private lastRemoteStatus: PublicStateDTO["status"] | null = null;
  private lastRemoteTurnNumber = 0;
  private lastRemoteCurrentPlayerId = "";
  private lastAutoPassedTurnNumber: number | null = null;
  private playingWaiters: Array<() => void> = [];

  constructor(
    players: readonly Player[],
    rules: DominoRules,
    private readonly networkService: NetworkService,
    private readonly localPlayerId: string,
    matchConfig: MatchConfig,
    turnDurationMs = 60_000
  ) {
    this.timerService = new TimerService(
      players.map((player) => player.id),
      turnDurationMs
    );

    if (LOCAL_MODE) {
      this.localMatch = new Match(players, rules, matchConfig);
    } else {
      this.remoteView = new RemoteGameView();
      this.remoteView.setLocalPlayerId(localPlayerId);
      this.currentGame = this.remoteView;
      this.wireRemoteEvents();
    }
  }

  async startMatch(): Promise<void> {
    if (this.localMatch) {
      this.currentGame = this.localMatch.startNextRound();
      this.replayManager.recordRoundStart(this.currentGame.getPlayerIds());
      this.timerService.startTurn(this.currentGame.getCurrentPlayerId());
      this.events.emit("stateChanged");
      this.events.emit("timelineEvent", { type: "match_started" });
      this.autoPassLocalIfStuck();
      return;
    }

    // Modo online: so avisa o servidor que este cliente esta pronto. A
    // partida so comeca de verdade (pecas distribuidas, status "playing")
    // quando os 4 jogadores enviarem player_ready - ver DominoRoom.
    await this.networkService.sendReady();
    await this.waitUntilPlaying();
  }

  getCurrentGame(): GameView {
    if (!this.currentGame) {
      throw new Error("Partida ainda nao iniciada: chame startMatch() primeiro");
    }
    return this.currentGame;
  }

  getTimerService(): TimerService {
    return this.timerService;
  }

  getReplayManager(): ReplayManager {
    return this.replayManager;
  }

  // Em quais lados (nenhum, um ou os dois) uma peca da mao pode ser jogada
  // agora. Usado pela camada visual para decidir se joga direto (so um
  // lado serve) ou se precisa perguntar ao jogador qual ponta usar (os
  // dois servem) - sem que a Scene precise conhecer regras do tabuleiro.
  getPlayableSides(playerId: string, pieceId: string): MoveSide[] {
    const game = this.getCurrentGame();
    const sides: MoveSide[] = [];
    if (game.canPlay(playerId, pieceId, "left")) sides.push("left");
    if (game.canPlay(playerId, pieceId, "right")) sides.push("right");
    return sides;
  }

  // Valor exposto em cada ponta aberta do tabuleiro, pra UI mostrar ao
  // jogador o que cada escolha de lado realmente conecta. null = mesa
  // vazia (nenhuma ponta ainda).
  getOpenEndValues(): { left: number; right: number } | null {
    const board = this.getCurrentGame().getBoard();
    if (board.length === 0) return null;
    return { left: board[0]!.left, right: board[board.length - 1]!.right };
  }

  playPiece(playerId: string, pieceId: string, side: MoveSide): void {
    if (this.localMatch) {
      this.applyLocalMove(playerId, pieceId, side);
      return;
    }

    if (playerId !== this.localPlayerId) {
      throw new Error("Neste cliente, apenas o jogador local pode iniciar uma jogada");
    }

    const piece = this.findPiece(playerId, pieceId);
    // Modo online: nao muta nada aqui. So aplica quando o servidor
    // confirmar via receivePublicState/receiveHand (ver wireRemoteEvents).
    void this.networkService.playPiece({
      playerId,
      piece: { left: piece.left, right: piece.right },
      side
    });
  }

  drawPiece(playerId: string): void {
    if (this.localMatch) {
      this.localMatch.getCurrentGame().drawPiece(playerId);
      this.events.emit("stateChanged");
      return;
    }

    void this.networkService.drawPiece(playerId);
  }

  passTurn(playerId: string): void {
    if (this.localMatch) {
      const game = this.localMatch.getCurrentGame();
      game.passTurn(playerId);
      this.events.emit("timelineEvent", { type: "turn_passed", playerId });
      this.timerService.startTurn(game.getCurrentPlayerId());
      const roundEnded = this.checkLocalRoundEnd();
      this.events.emit("stateChanged");
      if (!roundEnded) this.autoPassLocalIfStuck();
      return;
    }

    void this.networkService.passTurn(playerId);
  }

  private applyLocalMove(playerId: string, pieceId: string, side: MoveSide): void {
    const piece = this.findPiece(playerId, pieceId);
    const game = this.localMatch!.getCurrentGame();
    game.playPiece(playerId, pieceId, side);
    this.replayManager.recordMove({ playerId, pieceId, side, at: Date.now() });
    this.events.emit("timelineEvent", {
      type: "tile_played",
      playerId,
      piece: { left: piece.left, right: piece.right },
      side
    });
    this.timerService.startTurn(game.getCurrentPlayerId());
    const roundEnded = this.checkLocalRoundEnd();
    this.events.emit("stateChanged");
    if (!roundEnded) this.autoPassLocalIfStuck();
  }

  private findPiece(playerId: string, pieceId: string): DominoPiece {
    const piece = this.getCurrentGame()
      .getHand(playerId)
      .getPieces()
      .find((candidate) => candidate.id === pieceId);

    if (!piece) {
      throw new Error(`Peca ${pieceId} nao encontrada na mao de ${playerId}`);
    }
    return piece;
  }

  private checkLocalRoundEnd(): boolean {
    const game = this.localMatch!.getCurrentGame();
    const emptyHandedPlayerId = game.getPlayerIds().find((id) => game.isPlayerHandEmpty(id)) ?? null;

    if (emptyHandedPlayerId === null && !game.isBlocked()) return false;

    const result = this.localMatch!.finishRound(emptyHandedPlayerId);
    this.timerService.stopAll();
    this.events.emit("roundEnded", result);

    if (this.localMatch!.isMatchOver()) {
      this.events.emit("matchEnded", this.localMatch!.getMatchWinnerId());
    }
    return true;
  }

  // Regra do dominó: quem não tem nenhuma jogada válida passa a vez
  // automaticamente (não é uma ação manual do jogador). Sem isso o turno
  // trava indefinidamente no jogador sem jogada. Chama passTurn() de novo
  // recursivamente porque passar pode empurrar o turno para outro jogador
  // que também não tenha jogada (cadeia de passes até travar ou alguém
  // conseguir jogar).
  private autoPassLocalIfStuck(): void {
    const game = this.localMatch!.getCurrentGame();
    const currentPlayerId = game.getCurrentPlayerId();
    if (this.hasAnyLegalMove(game, currentPlayerId)) return;
    this.passTurn(currentPlayerId);
  }

  private hasAnyLegalMove(game: GameView, playerId: string): boolean {
    return game
      .getHand(playerId)
      .getPieces()
      .some((piece) => game.canPlay(playerId, piece.id, "left") || game.canPlay(playerId, piece.id, "right"));
  }

  // ---------- modo online: so reflete o que o servidor confirma ----------

  private wireRemoteEvents(): void {
    this.networkService.receivePublicState((state) => this.applyRemoteState(state));
    this.networkService.receiveHand((hand) => {
      this.remoteView?.applyHand(this.localPlayerId, hand);
      this.events.emit("stateChanged");
      this.autoPassRemoteIfStuck();
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
    if (!this.remoteView) return;

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
    this.autoPassRemoteIfStuck();
  }

  private waitUntilPlaying(): Promise<void> {
    if (this.lastRemoteStatus === "playing") return Promise.resolve();
    return new Promise((resolve) => this.playingWaiters.push(resolve));
  }

  // Mesma regra do modo local (ver autoPassLocalIfStuck), so que aqui so
  // pode disparar pass_turn para o PROPRIO jogador local - o servidor e
  // quem decide o resto. Chamado tanto quando o estado publico muda quanto
  // quando a mao chega (hand_update), porque a ordem entre os dois nao e
  // garantida: se o estado bater "e meu turno" antes da mao carregar, a
  // dedupe por turnNumber deixa a checagem pendente ate a mao chegar (uma
  // mao ainda nao carregada teria 0 pecas, o que faria essa funcao pensar,
  // errado, que o jogador esta sem jogada).
  private autoPassRemoteIfStuck(): void {
    if (!this.remoteView) return;
    if (this.lastRemoteStatus !== "playing") return;
    if (this.lastAutoPassedTurnNumber === this.lastRemoteTurnNumber) return;
    if (this.lastRemoteCurrentPlayerId !== this.localPlayerId) return;

    const hand = this.remoteView.getHand(this.localPlayerId);
    if (hand.count() === 0) return;

    this.lastAutoPassedTurnNumber = this.lastRemoteTurnNumber;
    if (!this.hasAnyLegalMove(this.remoteView, this.localPlayerId)) {
      void this.networkService.passTurn(this.localPlayerId);
    }
  }

  private handleRemoteMatchEnd(result: MatchEndDTO): void {
    if (!this.remoteView) return;

    const scoreByPlayer = new Map<string, number>();
    let winnerId: string | null = null;

    if (!result.isDraw) {
      this.remoteView.getPlayerIds().forEach((playerId, index) => {
        const team = index % 2; // seats 0/2 = time A, seats 1/3 = time B (ver DominoRules.teamOf no servidor)
        const won = team === result.winningTeam;
        scoreByPlayer.set(playerId, won ? 1 : 0);
        if (won && winnerId === null) winnerId = playerId;
      });
    } else {
      this.remoteView.getPlayerIds().forEach((playerId) => scoreByPlayer.set(playerId, 0));
    }

    this.timerService.stopAll();
    this.events.emit("roundEnded", { winnerId, scoreByPlayer, reason: result.reason });
    this.events.emit("matchEnded", winnerId);
  }
}
