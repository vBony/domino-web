import { DominoPiece } from "./DominoPiece";

// Regras de configuracao da variante (double-six, double-nine, ...):
// como gerar o baralho, quantas pecas distribuir e quem comeca a partida.
// Nao decide se uma jogada especifica e valida agora - isso e o MoveValidator.
export interface DominoRulesConfig {
  maxPips: number;
  handSize: number;
}

export const STANDARD_DOUBLE_SIX_RULES: DominoRulesConfig = {
  maxPips: 6,
  handSize: 7
};

export class DominoRules {
  constructor(private readonly config: DominoRulesConfig) {}

  createDeck(): DominoPiece[] {
    const deck: DominoPiece[] = [];
    for (let left = 0; left <= this.config.maxPips; left++) {
      for (let right = left; right <= this.config.maxPips; right++) {
        deck.push(new DominoPiece(left, right));
      }
    }
    return deck;
  }

  getHandSize(): number {
    return this.config.handSize;
  }

  getMaxPips(): number {
    return this.config.maxPips;
  }

  // Quem comeca: maior duplo entre todas as maos; se ninguem tiver duplo,
  // quem tiver a peca de maior soma de pips.
  determineStartingPlayerIndex(hands: readonly (readonly DominoPiece[])[]): number {
    let bestIndex = 0;
    let bestIsDouble = false;
    let bestValue = -1;

    hands.forEach((hand, index) => {
      for (const piece of hand) {
        const isDouble = piece.isDouble();
        const value = isDouble ? piece.left : piece.totalPips();
        const isBetter = (isDouble && !bestIsDouble) || (isDouble === bestIsDouble && value > bestValue);

        if (isBetter) {
          bestIndex = index;
          bestIsDouble = isDouble;
          bestValue = value;
        }
      }
    });

    return bestIndex;
  }
}
