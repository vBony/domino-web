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
  // true quando o trecho atual anda no sentido negativo do eixo (esquerda
  // ou para cima). piece.left sempre encosta no vizinho anterior da cadeia
  // e piece.right no proximo (ver DominoGame/GameState), mas isso so cai
  // certo em "esquerda-fica-na-esquerda-da-tela"/"topo-fica-em-cima" quando
  // a cobra anda no sentido positivo (direita/baixo). Nos trechos que andam
  // pro lado negativo, quem desenha (DominoPieceView) precisa inverter qual
  // metade fisica mostra qual valor, senao a peca fica com os dois lados
  // trocados na tela mesmo com os dados corretos.
  reversed: boolean;
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

      // So uma dupla pode virar a cobra - igual no domino real, onde so
      // pecas carroca sao jogadas atravessadas (de bucha). Uma peca comum
      // tem valores left/right diferentes que so fazem sentido alinhados
      // com UMA direcao (o "left" encosta no vizinho de tras, o "right" no
      // da frente); se ela virasse a curva, seria desenhada em pe (valores
      // no topo/base em vez de esquerda/direita) e o valor que deveria
      // encostar no vizinho anterior nao apareceria mais do lado certo -
      // parecendo, visualmente, que qualquer peca encaixa em qualquer
      // ponta. A dupla nao tem esse problema (left === right), entao pode
      // ser desenhada em pe sem ambiguidade. Se o segmento passar do
      // limite sem nenhuma dupla por perto, ele so continua reto ate a
      // proxima dupla aparecer - mais longo visualmente, mas nunca errado.
      const shouldPivot = piece.isDouble() && segmentDistance + lengthAlongDirection >= this.config.maxSegmentLength;

      if (shouldPivot) {
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
        rotation: this.computeRotation(isHorizontalDirection, piece.isDouble()),
        reversed: direction.dx < 0 || direction.dy < 0
      });

      cursorX += direction.dx * lengthAlongDirection;
      cursorY += direction.dy * lengthAlongDirection;
      segmentDistance += lengthAlongDirection;
    }

    return placed;
  }

  // A peca que vira a cobra e sempre uma dupla (ver computeLayout), entao
  // fica centralizada na linha do trecho anterior - convencao visual de
  // bucha (crossways) - sem precisar de nenhum ajuste extra de alinhamento.
  private placePivot(
    piece: DominoPiece,
    cursorX: number,
    cursorY: number,
    direction: Direction,
    nextDirection: Direction
  ): { placedPiece: PlacedPiece; nextCursorX: number; nextCursorY: number } {
    const halfThickness = this.config.pieceWidth / 2;
    const halfPivotLength = this.config.pieceLength / 2;

    const pivotX = cursorX + direction.dx * halfThickness;
    const pivotY = cursorY + direction.dy * halfThickness;

    // A silhueta da dobradica acompanha a NOVA direcao (alta se o proximo
    // trecho for vertical, deitada se for horizontal) - nao a direcao antiga.
    const nextIsHorizontal = nextDirection.dy === 0;
    const rotation = nextIsHorizontal ? 0 : Math.PI / 2;

    return {
      // reversed nao importa aqui: quem vira a cobra e sempre uma dupla
      // (left === right), entao as duas metades mostram o mesmo valor.
      placedPiece: { piece, x: pivotX, y: pivotY, rotation, reversed: false },
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
