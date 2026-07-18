import { DominoPiece } from "@engine/DominoPiece";
import { Player } from "@engine/Player";
import { DominoRules } from "@engine/DominoRules";
import { MoveSide } from "@engine/MoveValidator";
import { GameState } from "@engine/GameState";
import { Match, MatchConfig } from "@engine/Match";
import { RoundResult } from "@engine/WinnerCalculator";
import { NetworkService, MoveDTO } from "@network/NetworkService";
import { TimerService } from "@services/TimerService";
import { ReplayManager } from "@managers/ReplayManager";
import { EventEmitter } from "@utils/EventEmitter";
import { LOCAL_MODE } from "@config/localMode";

export interface GameManagerEvents extends Record<string, unknown[]> {
  stateChanged: [];
  roundEnded: [RoundResult];
  matchEnded: [string | null];
}

// Orquestrador de mais alto nivel: e o unico lugar onde LOCAL_MODE muda o
// comportamento de fato. Em modo local, qualquer assento joga direto no
// GameState (para testar os 4 jogadores numa unica aba). Em modo online,
// so o jogador local pode iniciar uma jogada neste cliente, e ela so e
// aplicada quando confirmada pelo servidor via NetworkService.receiveMove().
export class GameManager {
  readonly events = new EventEmitter<GameManagerEvents>();
  private readonly match: Match;
  private readonly replayManager = new ReplayManager();
  private readonly timerService: TimerService;
  private currentGame: GameState | null = null;

  constructor(
    players: readonly Player[],
    rules: DominoRules,
    private readonly networkService: NetworkService,
    private readonly localPlayerId: string,
    matchConfig: MatchConfig,
    turnDurationMs = 60_000
  ) {
    this.match = new Match(players, rules, matchConfig);
    this.timerService = new TimerService(
      players.map((player) => player.id),
      turnDurationMs
    );

    if (!LOCAL_MODE) {
      this.networkService.receiveMove((move) => this.applyMoveFromNetwork(move));
    }
  }

  startMatch(): void {
    this.currentGame = this.match.startNextRound();
    this.replayManager.recordRoundStart(this.currentGame.getPlayerIds());
    this.timerService.startTurn(this.currentGame.getCurrentPlayerId());
    this.events.emit("stateChanged");
  }

  getCurrentGame(): GameState {
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

  // Decide em qual lado (se algum) uma peca da mao pode ser jogada agora.
  // Usado pela camada visual para transformar "clique numa peca" em uma
  // jogada valida, sem que a Scene precise conhecer regras do tabuleiro.
  getPlayableSide(playerId: string, pieceId: string): MoveSide | null {
    const game = this.getCurrentGame();
    if (game.canPlay(playerId, pieceId, "left")) return "left";
    if (game.canPlay(playerId, pieceId, "right")) return "right";
    return null;
  }

  playPiece(playerId: string, pieceId: string, side: MoveSide): void {
    if (LOCAL_MODE) {
      this.applyMove(playerId, pieceId, side);
      return;
    }

    if (playerId !== this.localPlayerId) {
      throw new Error("Neste cliente, apenas o jogador local pode iniciar uma jogada");
    }

    const piece = this.findPiece(playerId, pieceId);
    // Modo online: nao muta o estado aqui. So aplica quando o servidor
    // confirmar a jogada via receiveMove() (ver applyMoveFromNetwork).
    void this.networkService.playPiece({
      playerId,
      piece: { left: piece.left, right: piece.right },
      side
    });
  }

  drawPiece(playerId: string): void {
    if (LOCAL_MODE) {
      this.getCurrentGame().drawPiece(playerId);
      this.events.emit("stateChanged");
      return;
    }

    // TODO integracao futura: aplicar a peca retornada pelo servidor ao chegar a resposta.
    void this.networkService.drawPiece(playerId);
  }

  passTurn(playerId: string): void {
    if (LOCAL_MODE) {
      this.getCurrentGame().passTurn(playerId);
      this.timerService.startTurn(this.getCurrentGame().getCurrentPlayerId());
      this.checkRoundEnd();
      this.events.emit("stateChanged");
      return;
    }

    void this.networkService.passTurn(playerId);
  }

  private applyMove(playerId: string, pieceId: string, side: MoveSide): void {
    const game = this.getCurrentGame();
    game.playPiece(playerId, pieceId, side);
    this.replayManager.recordMove({ playerId, pieceId, side, at: Date.now() });
    this.timerService.startTurn(game.getCurrentPlayerId());
    this.checkRoundEnd();
    this.events.emit("stateChanged");
  }

  private applyMoveFromNetwork(move: MoveDTO): void {
    const pieceId = new DominoPiece(move.piece.left, move.piece.right).id;
    this.applyMove(move.playerId, pieceId, move.side);
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

  private checkRoundEnd(): void {
    const game = this.getCurrentGame();
    const emptyHandedPlayerId = game.getPlayerIds().find((id) => game.isPlayerHandEmpty(id)) ?? null;

    if (emptyHandedPlayerId === null && !game.isBlocked()) return;

    const result = this.match.finishRound(emptyHandedPlayerId);
    this.timerService.stopAll();
    this.events.emit("roundEnded", result);

    if (this.match.isMatchOver()) {
      this.events.emit("matchEnded", this.match.getMatchWinnerId());
    }
  }
}
