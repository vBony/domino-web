import { Player } from "./Player";
import { GameState } from "./GameState";
import { DominoRules } from "./DominoRules";
import { WinnerCalculator, HandSummary, RoundResult } from "./WinnerCalculator";

// Orquestra uma partida ao longo de multiplas rodadas: cria cada GameState,
// fecha a rodada via WinnerCalculator e acumula pontuacao ate alguem
// atingir a pontuacao alvo. Pensado para escalar para torneios/rankeadas
// (cada Match e uma unidade independente, com seu proprio placar).
export interface MatchConfig {
  targetScore: number;
}

export class Match {
  private currentGame: GameState | null = null;
  private readonly cumulativeScores = new Map<string, number>();
  private readonly winnerCalculator = new WinnerCalculator();
  private roundNumber = 0;
  private matchWinnerId: string | null = null;

  constructor(
    private readonly players: readonly Player[],
    private readonly rules: DominoRules,
    private readonly config: MatchConfig
  ) {
    for (const player of players) {
      this.cumulativeScores.set(player.id, 0);
    }
  }

  startNextRound(): GameState {
    this.roundNumber += 1;
    const playerIds = this.players.map((player) => player.id);
    this.currentGame = new GameState(this.rules, playerIds);
    this.currentGame.start();
    return this.currentGame;
  }

  getCurrentGame(): GameState {
    if (!this.currentGame) {
      throw new Error("Nenhuma rodada em andamento");
    }
    return this.currentGame;
  }

  finishRound(emptyHandedPlayerId: string | null): RoundResult {
    const game = this.getCurrentGame();
    const hands: HandSummary[] = this.players.map((player) => ({
      playerId: player.id,
      totalPips: game.getHand(player.id).totalPips()
    }));

    const result = this.winnerCalculator.calculate(hands, emptyHandedPlayerId);

    for (const [playerId, roundScore] of result.scoreByPlayer) {
      const previous = this.cumulativeScores.get(playerId) ?? 0;
      this.cumulativeScores.set(playerId, previous + roundScore);
    }

    game.finish();
    this.checkMatchWinner();
    return result;
  }

  isMatchOver(): boolean {
    return this.matchWinnerId !== null;
  }

  getMatchWinnerId(): string | null {
    return this.matchWinnerId;
  }

  getCumulativeScore(playerId: string): number {
    return this.cumulativeScores.get(playerId) ?? 0;
  }

  getRoundNumber(): number {
    return this.roundNumber;
  }

  getPlayers(): readonly Player[] {
    return this.players;
  }

  private checkMatchWinner(): void {
    for (const [playerId, score] of this.cumulativeScores) {
      if (score >= this.config.targetScore) {
        this.matchWinnerId = playerId;
        break;
      }
    }
  }
}
