// Calcula o resultado de uma rodada encerrada, nos dois cenarios classicos
// do domino: alguem zerou a mao, ou o jogo travou (ninguem consegue jogar).
export interface HandSummary {
  playerId: string;
  totalPips: number;
}

export interface RoundResult {
  winnerId: string | null;
  scoreByPlayer: Map<string, number>;
  reason: "hand-empty" | "blocked";
}

export class WinnerCalculator {
  calculate(hands: readonly HandSummary[], emptyHandedPlayerId: string | null): RoundResult {
    return emptyHandedPlayerId !== null
      ? this.calculateHandEmptyResult(hands, emptyHandedPlayerId)
      : this.calculateBlockedResult(hands);
  }

  // Quem zera a mao ganha a soma dos pips que sobraram em todas as maos adversarias.
  private calculateHandEmptyResult(hands: readonly HandSummary[], winnerId: string): RoundResult {
    const scoreByPlayer = new Map<string, number>();
    let winnerScore = 0;

    for (const hand of hands) {
      if (hand.playerId === winnerId) continue;
      scoreByPlayer.set(hand.playerId, 0);
      winnerScore += hand.totalPips;
    }
    scoreByPlayer.set(winnerId, winnerScore);

    return { winnerId, scoreByPlayer, reason: "hand-empty" };
  }

  // Jogo travado (ninguem tem jogada): sempre termina empatado, sem
  // decidir vencedor pela soma de pips na mao. Uma revanche valendo o
  // dobro de pontos para desempatar fica para uma proxima rodada.
  private calculateBlockedResult(hands: readonly HandSummary[]): RoundResult {
    const scoreByPlayer = new Map<string, number>();
    for (const hand of hands) {
      scoreByPlayer.set(hand.playerId, 0);
    }
    return { winnerId: null, scoreByPlayer, reason: "blocked" };
  }
}
