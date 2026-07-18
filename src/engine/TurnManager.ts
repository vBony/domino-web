// Controla de quem e a vez, entre N assentos, e detecta jogo travado
// (todos os jogadores passaram em sequencia). Nao sabe nada sobre pecas
// ou tabuleiro - so ordem de turno.
export class TurnManager {
  private currentIndex: number;
  private consecutivePasses = 0;

  constructor(
    private readonly playerCount: number,
    startingIndex: number = 0
  ) {
    if (playerCount <= 0) {
      throw new Error("playerCount deve ser maior que zero");
    }
    if (startingIndex < 0 || startingIndex >= playerCount) {
      throw new Error(`startingIndex ${startingIndex} fora do intervalo valido`);
    }
    this.currentIndex = startingIndex;
  }

  getCurrentPlayerIndex(): number {
    return this.currentIndex;
  }

  // Uma jogada valida encerra a sequencia de passes.
  advance(): void {
    this.currentIndex = (this.currentIndex + 1) % this.playerCount;
    this.consecutivePasses = 0;
  }

  registerPass(): void {
    this.consecutivePasses += 1;
    this.currentIndex = (this.currentIndex + 1) % this.playerCount;
  }

  isBlocked(): boolean {
    return this.consecutivePasses >= this.playerCount;
  }
}
