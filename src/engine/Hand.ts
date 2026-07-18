import { DominoPiece } from "./DominoPiece";

// Colecao de pecas de um jogador. Responsabilidade unica: gerenciar
// quais pecas o jogador possui. Decidir se uma peca "e jogavel" e do
// MoveValidator, nao da Hand, para nao misturar dado com regra.
export class Hand {
  private pieces: DominoPiece[];

  constructor(initialPieces: readonly DominoPiece[] = []) {
    this.pieces = [...initialPieces];
  }

  getPieces(): readonly DominoPiece[] {
    return this.pieces;
  }

  add(piece: DominoPiece): void {
    this.pieces.push(piece);
  }

  remove(pieceId: string): DominoPiece {
    const index = this.pieces.findIndex((piece) => piece.id === pieceId);
    if (index === -1) {
      throw new Error(`Peca ${pieceId} nao esta na mao`);
    }
    return this.pieces.splice(index, 1)[0]!;
  }

  has(pieceId: string): boolean {
    return this.pieces.some((piece) => piece.id === pieceId);
  }

  count(): number {
    return this.pieces.length;
  }

  isEmpty(): boolean {
    return this.pieces.length === 0;
  }

  totalPips(): number {
    return this.pieces.reduce((sum, piece) => sum + piece.totalPips(), 0);
  }
}
