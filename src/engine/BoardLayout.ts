import { DominoPiece } from "./DominoPiece";
import { BoardBounds } from "./BoardBounds";

// Calcula posicao (x,y) e rotacao de cada peca da cadeia do tabuleiro,
// em "unidades de mundo" (nao pixels de tela - isso e responsabilidade
// de quem desenha). Sem fisica, sem colisao: tudo matematico, seguindo
// um layout em "cobra" (snake) que muda de direcao ao atingir o limite
// de comprimento de um segmento, evitando que o tabuleiro saia da tela.
export interface PlacedPiece {
  piece: DominoPiece;
  x: number;
  y: number;
  rotation: number;
}

export interface BoardLayoutConfig {
  pieceLength: number;
  pieceWidth: number;
  maxSegmentLength: number;
}

interface Direction {
  dx: number;
  dy: number;
}

const DIRECTIONS: readonly Direction[] = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: -1 }
];

export class BoardLayout {
  constructor(private readonly config: BoardLayoutConfig) {}

  computeLayout(chain: readonly DominoPiece[]): PlacedPiece[] {
    const placed: PlacedPiece[] = [];
    let directionIndex = 0;
    let cursorX = 0;
    let cursorY = 0;
    let segmentDistance = 0;

    for (const piece of chain) {
      const direction = DIRECTIONS[directionIndex]!;
      const lengthAlongDirection = piece.isDouble() ? this.config.pieceWidth : this.config.pieceLength;

      // Qualquer peca pode virar a cobra, inclusive uma dupla: como a
      // dobradica fica centralizada na mesma linha do segmento anterior
      // (ver placePivot), sua silhueta e identica a de uma dupla comum no
      // meio do trecho - nao ha conflito visual.
      //
      // Alem do gatilho normal (limite do segmento ja atingido), uma dupla
      // que ENCERRARIA o trecho antecipa a virada e vira a dobradica ela
      // mesma: se ficasse na fileira como ultima peca, ela (perpendicular)
      // e a dobradica seguinte (tambem perpendicular) ficariam lado a lado,
      // parecendo duas pecas viradas coladas - visual que nao existe no
      // domino real.
      const limitReached = segmentDistance >= this.config.maxSegmentLength;
      const doubleWouldEndSegment =
        piece.isDouble() && segmentDistance + lengthAlongDirection >= this.config.maxSegmentLength;

      if (limitReached || doubleWouldEndSegment) {
        const nextDirection = DIRECTIONS[(directionIndex + 1) % DIRECTIONS.length]!;
        const pivot = this.placePivot(piece, cursorX, cursorY, direction, nextDirection);
        placed.push(pivot.placedPiece);

        cursorX = pivot.nextCursorX;
        cursorY = pivot.nextCursorY;
        directionIndex = (directionIndex + 1) % DIRECTIONS.length;
        segmentDistance = 0;
        continue;
      }

      const isHorizontalDirection = direction.dy === 0;
      const halfLength = lengthAlongDirection / 2;

      placed.push({
        piece,
        x: cursorX + direction.dx * halfLength,
        y: cursorY + direction.dy * halfLength,
        rotation: this.computeRotation(isHorizontalDirection, piece.isDouble())
      });

      cursorX += direction.dx * lengthAlongDirection;
      cursorY += direction.dy * lengthAlongDirection;
      segmentDistance += lengthAlongDirection;
    }

    return placed;
  }

  // A peca que vira a cobra funciona como uma dobradica: encosta na ultima
  // peca do trecho (meia espessura ao longo da direcao antiga) e fica com a
  // borda EXTERNA (o lado oposto a nova direcao) alinhada com a borda
  // externa do trecho antigo - nao centralizada na linha. Assim o "topo" da
  // peca da curva fica rente ao topo da fileira e ela se estende so para o
  // lado da virada. Excecao: uma bucha fazendo a curva permanece
  // centralizada na linha, que e a convencao visual de bucha (crossways).
  private placePivot(
    piece: DominoPiece,
    cursorX: number,
    cursorY: number,
    direction: Direction,
    nextDirection: Direction
  ): { placedPiece: PlacedPiece; nextCursorX: number; nextCursorY: number } {
    const halfThickness = this.config.pieceWidth / 2;
    const halfPivotLength = this.config.pieceLength / 2;

    const offsetAlongNew = piece.isDouble() ? 0 : halfPivotLength - halfThickness;
    const pivotX = cursorX + direction.dx * halfThickness + nextDirection.dx * offsetAlongNew;
    const pivotY = cursorY + direction.dy * halfThickness + nextDirection.dy * offsetAlongNew;

    // A silhueta da dobradica acompanha a NOVA direcao (alta se o proximo
    // trecho for vertical, deitada se for horizontal) - nao a direcao antiga.
    const nextIsHorizontal = nextDirection.dy === 0;
    const rotation = nextIsHorizontal ? 0 : Math.PI / 2;

    return {
      placedPiece: { piece, x: pivotX, y: pivotY, rotation },
      nextCursorX: pivotX + nextDirection.dx * halfPivotLength,
      nextCursorY: pivotY + nextDirection.dy * halfPivotLength
    };
  }

  computeBounds(placedPieces: readonly PlacedPiece[]): BoardBounds {
    let bounds = BoardBounds.empty();

    for (const placed of placedPieces) {
      const isRotated = placed.rotation !== 0;
      const halfExtentX = (isRotated ? this.config.pieceWidth : this.config.pieceLength) / 2;
      const halfExtentY = (isRotated ? this.config.pieceLength : this.config.pieceWidth) / 2;

      bounds = bounds.expandToInclude(placed.x - halfExtentX, placed.y - halfExtentY);
      bounds = bounds.expandToInclude(placed.x + halfExtentX, placed.y + halfExtentY);
    }

    return bounds;
  }

  // Duplas sao desenhadas perpendiculares a direcao da cadeia (visual classico
  // de domino). Por isso a rotacao depende da combinacao direcao x e-dupla.
  private computeRotation(isHorizontalDirection: boolean, isDouble: boolean): number {
    if (isHorizontalDirection) {
      return isDouble ? Math.PI / 2 : 0;
    }
    return isDouble ? 0 : Math.PI / 2;
  }
}
