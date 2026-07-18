// Entidade jogador: identidade (id/name/seat) e imutavel, status e o unico
// campo que muda ao longo da partida. Nao guarda a Hand (ver Hand.ts) -
// GameState associa jogador -> mao por playerId, para manter Player
// reutilizavel por qualquer jogo de mesa, nao so domino.
export type PlayerStatus = "waiting" | "playing" | "passed" | "disconnected";

export class Player {
  private status: PlayerStatus;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly seat: number,
    initialStatus: PlayerStatus = "waiting"
  ) {
    if (!Number.isInteger(seat) || seat < 0) {
      throw new Error(`Assento invalido para o jogador ${id}: ${seat}`);
    }
    this.status = initialStatus;
  }

  getStatus(): PlayerStatus {
    return this.status;
  }

  setStatus(status: PlayerStatus): void {
    this.status = status;
  }

  equals(other: Player): boolean {
    return this.id === other.id;
  }
}
