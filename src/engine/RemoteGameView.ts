import { DominoPiece } from "./DominoPiece";
import { GameView } from "./GameView";
import { Hand } from "./Hand";
import { MoveSide } from "./MoveValidator";

export interface RemotePlayerInfo {
  id: string;
  seat: number;
  tilesCount: number;
}

export interface RemoteBoardTile {
  left: number;
  right: number;
}

// Reutilizado para representar as pecas de um adversario: so a contagem
// (RemotePlayerInfo.tilesCount) e real. O servidor nunca envia os valores
// da mao alheia (fog of war), entao o CONTEUDO deste objeto nunca deve ser
// lido - so Hand.count() sobre ele e seguro.
const OPPONENT_PLACEHOLDER_PIECE = new DominoPiece(0, 0);

// Espelha, no cliente, o estado publico que o servidor autoritativo envia
// (DominoState + hand_update) atraves da mesma interface GameView usada
// pelo modo local (GameState) - assim TableScene/GameManager nao precisam
// saber se estao lendo dados locais ou do servidor. NUNCA decide se uma
// jogada e valida; isso e responsabilidade exclusiva do servidor.
export class RemoteGameView implements GameView {
  private localPlayerId: string | null = null;
  private playerIds: string[] = [];
  private currentPlayerId = "";
  private board: DominoPiece[] = [];
  private boneyardCount = 0;
  private blocked = false;
  private readonly hands = new Map<string, Hand>();

  setLocalPlayerId(playerId: string): void {
    this.localPlayerId = playerId;
  }

  applyPublicState(players: readonly RemotePlayerInfo[], board: readonly RemoteBoardTile[], currentTurn: string, remainingTiles: number): void {
    this.playerIds = [...players].sort((a, b) => a.seat - b.seat).map((p) => p.id);
    this.currentPlayerId = currentTurn;
    this.board = board.map((tile) => new DominoPiece(tile.left, tile.right));
    this.boneyardCount = remainingTiles;

    for (const player of players) {
      if (player.id === this.localPlayerId) continue; // mao real vem de applyHand()
      this.hands.set(player.id, new Hand(new Array(player.tilesCount).fill(OPPONENT_PLACEHOLDER_PIECE)));
    }
  }

  applyHand(playerId: string, pieces: readonly { left: number; right: number }[]): void {
    this.localPlayerId = playerId;
    this.hands.set(playerId, new Hand(pieces.map((piece) => new DominoPiece(piece.left, piece.right))));
  }

  setBlocked(blocked: boolean): void {
    this.blocked = blocked;
  }

  getPlayerIds(): readonly string[] {
    return this.playerIds;
  }

  getCurrentPlayerId(): string {
    return this.currentPlayerId;
  }

  getHand(playerId: string): Hand {
    return this.hands.get(playerId) ?? new Hand();
  }

  getBoard(): readonly DominoPiece[] {
    return this.board;
  }

  getBoneyardCount(): number {
    return this.boneyardCount;
  }

  isPlayerHandEmpty(playerId: string): boolean {
    return this.getHand(playerId).isEmpty();
  }

  isBlocked(): boolean {
    return this.blocked;
  }

  canPlay(playerId: string, pieceId: string, side: MoveSide): boolean {
    if (playerId !== this.currentPlayerId) return false;

    const piece = this.getHand(playerId)
      .getPieces()
      .find((candidate) => candidate.id === pieceId);
    if (!piece) return false;
    if (this.board.length === 0) return true;

    const openLeft = this.board[0]!.left;
    const openRight = this.board[this.board.length - 1]!.right;
    return side === "left" ? piece.hasValue(openLeft) : piece.hasValue(openRight);
  }
}
