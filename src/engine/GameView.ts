import { DominoPiece } from "./DominoPiece";
import { Hand } from "./Hand";
import { MoveSide } from "./MoveValidator";

// Superficie somente-leitura que GameManager/TableScene consomem de "o
// estado atual da rodada", sem se importar se quem fornece os dados e o
// GameState local (LOCAL_MODE) ou um RemoteGameView alimentado pelo
// servidor autoritativo (ver network/ColyseusNetworkService). GameState ja
// satisfaz esta interface estruturalmente.
export interface GameView {
  getPlayerIds(): readonly string[];
  getCurrentPlayerId(): string;
  getHand(playerId: string): Hand;
  getBoard(): readonly DominoPiece[];
  getBoneyardCount(): number;
  isPlayerHandEmpty(playerId: string): boolean;
  isBlocked(): boolean;
  canPlay(playerId: string, pieceId: string, side: MoveSide): boolean;
}
