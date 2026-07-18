// Value object imutavel: representa uma peca de domino (par de valores).
// Nao depende de Phaser nem de nenhuma camada de apresentacao.
export class DominoPiece {
  public readonly id: string;

  constructor(
    public readonly left: number,
    public readonly right: number
  ) {
    if (!Number.isInteger(left) || !Number.isInteger(right) || left < 0 || right < 0) {
      throw new Error(`DominoPiece invalida: (${left}, ${right})`);
    }
    // Como cada combinacao (min, max) e unica num set padrao, o id
    // e derivado dos valores em vez de gerado aleatoriamente,
    // garantindo determinismo para testes e replay.
    this.id = `${Math.min(left, right)}-${Math.max(left, right)}`;
  }

  isDouble(): boolean {
    return this.left === this.right;
  }

  totalPips(): number {
    return this.left + this.right;
  }

  hasValue(value: number): boolean {
    return this.left === value || this.right === value;
  }

  // Dado um valor que encaixa numa ponta aberta, retorna o valor da outra extremidade da peca.
  getOtherEnd(matchedValue: number): number {
    if (this.left === matchedValue) return this.right;
    if (this.right === matchedValue) return this.left;
    throw new Error(`Peca ${this.id} nao possui o valor ${matchedValue}`);
  }

  // Retorna uma nova instancia com os lados invertidos (imutabilidade).
  flipped(): DominoPiece {
    return new DominoPiece(this.right, this.left);
  }

  equals(other: DominoPiece): boolean {
    return this.id === other.id;
  }

  toString(): string {
    return `[${this.left}|${this.right}]`;
  }
}
