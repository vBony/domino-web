import { MoveSide } from "@engine/MoveValidator";

export interface RecordedMove {
  playerId: string;
  pieceId: string;
  side: MoveSide;
  at: number;
}

export interface ReplayRound {
  playerIds: readonly string[];
  moves: RecordedMove[];
}

// Estrutura de gravacao de partidas para replay futuro. Por enquanto so
// grava os eventos em memoria - reproducao (play/pause/seek) sera
// implementada quando o modo replay for priorizado (ver play() abaixo).
export class ReplayManager {
  private readonly rounds: ReplayRound[] = [];

  recordRoundStart(playerIds: readonly string[]): void {
    this.rounds.push({ playerIds, moves: [] });
  }

  recordMove(move: RecordedMove): void {
    const currentRound = this.rounds[this.rounds.length - 1];
    if (!currentRound) {
      throw new Error("Nenhuma rodada iniciada para registrar a jogada");
    }
    currentRound.moves.push(move);
  }

  getRounds(): readonly ReplayRound[] {
    return this.rounds;
  }

  // TODO: implementar reproducao (play/pause/seek) quando o modo replay for priorizado.
  play(): void {
    throw new Error("ReplayManager.play() ainda nao implementado");
  }
}
