// Value object imutavel: caixa delimitadora (bounding box) do tabuleiro.
// Usado pelo BoardLayout (para saber o quanto a mesa cresceu) e pelo
// CameraBounds (para calcular o enquadramento de camera).
export class BoardBounds {
  private constructor(
    public readonly minX: number,
    public readonly minY: number,
    public readonly maxX: number,
    public readonly maxY: number
  ) {}

  static empty(): BoardBounds {
    return new BoardBounds(Infinity, Infinity, -Infinity, -Infinity);
  }

  isEmpty(): boolean {
    return this.minX > this.maxX;
  }

  expandToInclude(x: number, y: number): BoardBounds {
    return new BoardBounds(
      Math.min(this.minX, x),
      Math.min(this.minY, y),
      Math.max(this.maxX, x),
      Math.max(this.maxY, y)
    );
  }

  width(): number {
    return this.isEmpty() ? 0 : this.maxX - this.minX;
  }

  height(): number {
    return this.isEmpty() ? 0 : this.maxY - this.minY;
  }

  centerX(): number {
    return this.isEmpty() ? 0 : (this.minX + this.maxX) / 2;
  }

  centerY(): number {
    return this.isEmpty() ? 0 : (this.minY + this.maxY) / 2;
  }
}
