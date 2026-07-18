import { DominoPiece } from "./DominoPiece";

// Validacao em tempo real: dado o estado atual das pontas abertas do
// tabuleiro, quais pecas da mao podem ser jogadas e em qual lado.
export interface OpenEnds {
  left: number;
  right: number;
}

export type MoveSide = "left" | "right";

export interface ValidMove {
  piece: DominoPiece;
  side: MoveSide;
}

export class MoveValidator {
  // openEnds === null significa tabuleiro vazio: qualquer peca pode abrir o jogo.
  isPlayable(piece: DominoPiece, openEnds: OpenEnds | null): boolean {
    if (openEnds === null) return true;
    return piece.hasValue(openEnds.left) || piece.hasValue(openEnds.right);
  }

  getValidMoves(hand: readonly DominoPiece[], openEnds: OpenEnds | null): ValidMove[] {
    if (openEnds === null) {
      return hand.map((piece) => ({ piece, side: "right" as MoveSide }));
    }

    const moves: ValidMove[] = [];
    for (const piece of hand) {
      if (piece.hasValue(openEnds.left)) {
        moves.push({ piece, side: "left" });
      }
      if (piece.hasValue(openEnds.right)) {
        moves.push({ piece, side: "right" });
      }
    }
    return moves;
  }

  hasAnyValidMove(hand: readonly DominoPiece[], openEnds: OpenEnds | null): boolean {
    return this.getValidMoves(hand, openEnds).length > 0;
  }
}
