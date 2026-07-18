import { EventEmitter } from "@utils/EventEmitter";

export interface TimerServiceEvents extends Record<string, unknown[]> {
  tick: [string, number];
  expired: [string];
}

// Cronometro de turno por jogador (estilo chess.com). Agnostico de fonte de
// tempo: nao usa setInterval nem Phaser.Time - quem tiver o loop real
// (Scene.update, por exemplo) chama tick(deltaMs) a cada frame.
export class TimerService {
  readonly events = new EventEmitter<TimerServiceEvents>();
  private readonly remainingByPlayer = new Map<string, number>();
  private activePlayerId: string | null = null;

  constructor(
    playerIds: readonly string[],
    private readonly turnDurationMs: number
  ) {
    for (const playerId of playerIds) {
      this.remainingByPlayer.set(playerId, turnDurationMs);
    }
  }

  startTurn(playerId: string): void {
    this.activePlayerId = playerId;
    this.remainingByPlayer.set(playerId, this.turnDurationMs);
  }

  tick(deltaMs: number): void {
    if (!this.activePlayerId) return;

    const previous = this.remainingByPlayer.get(this.activePlayerId) ?? 0;
    const remaining = Math.max(previous - deltaMs, 0);
    this.remainingByPlayer.set(this.activePlayerId, remaining);
    this.events.emit("tick", this.activePlayerId, remaining);

    if (remaining <= 0) {
      const expiredPlayerId = this.activePlayerId;
      this.activePlayerId = null;
      this.events.emit("expired", expiredPlayerId);
    }
  }

  getRemaining(playerId: string): number {
    return this.remainingByPlayer.get(playerId) ?? 0;
  }

  stopAll(): void {
    this.activePlayerId = null;
  }
}
