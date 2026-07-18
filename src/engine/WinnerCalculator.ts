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

  // Jogo travado: vence quem tiver menos pips na mao, pontuando a soma dos
  // pips dos adversarios. Empate na menor soma = ninguem pontua nesta rodada.
  private calculateBlockedResult(hands: readonly HandSummary[]): RoundResult {
    const lowestPips = Math.min(...hands.map((hand) => hand.totalPips));
    const candidates = hands.filter((hand) => hand.totalPips === lowestPips);

    const scoreByPlayer = new Map<string, number>();
    for (const hand of hands) {
      scoreByPlayer.set(hand.playerId, 0);
    }

    if (candidates.length !== 1) {
      return { winnerId: null, scoreByPlayer, reason: "blocked" };
    }

    const winner = candidates[0]!;
    const totalOpponentPips = hands
      .filter((hand) => hand.playerId !== winner.playerId)
      .reduce((sum, hand) => sum + hand.totalPips, 0);

    scoreByPlayer.set(winner.playerId, totalOpponentPips);
    return { winnerId: winner.playerId, scoreByPlayer, reason: "blocked" };
  }
}
