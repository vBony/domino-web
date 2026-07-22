import { DominoPiece } from "./DominoPiece";
import { GameView } from "./GameView";
import { Hand } from "./Hand";
import { MoveValidator, OpenEnds, MoveSide } from "./MoveValidator";
import { DominoRules } from "./DominoRules";
import { TurnManager } from "./TurnManager";

export type GameStatus = "waiting" | "in-progress" | "finished";

// Maquina de estados de uma rodada: baralho, mao de cada jogador, tabuleiro
// e turno. E a unica classe que muta essas estruturas - sempre validando
// a jogada antes (via MoveValidator) - para nenhuma camada externa (Scene,
// Manager, Network) conseguir colocar o jogo num estado invalido.
export class GameState implements GameView {
  private readonly playerIds: readonly string[];
  private readonly hands: Map<string, Hand>;
  private readonly turnManager: TurnManager;
  private readonly moveValidator = new MoveValidator();
  private board: DominoPiece[] = [];
  private boneyard: DominoPiece[];
  private status: GameStatus = "waiting";

  constructor(
    private readonly rules: DominoRules,
    playerIds: readonly string[],
    deck?: readonly DominoPiece[]
  ) {
    this.playerIds = [...playerIds];

    const sourceDeck = deck ? [...deck] : this.shuffle(this.rules.createDeck());
    this.hands = new Map();
    const dealtHands: DominoPiece[][] = [];

    for (const playerId of this.playerIds) {
      const dealt = sourceDeck.splice(0, this.rules.getHandSize());
      dealtHands.push(dealt);
      this.hands.set(playerId, new Hand(dealt));
    }
    this.boneyard = sourceDeck;

    const startingIndex = this.rules.determineStartingPlayerIndex(dealtHands);
    this.turnManager = new TurnManager(this.playerIds.length, startingIndex);
  }

  start(): void {
    this.status = "in-progress";
  }

  finish(): void {
    this.status = "finished";
  }

  getStatus(): GameStatus {
    return this.status;
  }

  getPlayerIds(): readonly string[] {
    return this.playerIds;
  }

  getCurrentPlayerId(): string {
    return this.playerIds[this.turnManager.getCurrentPlayerIndex()]!;
  }

  getHand(playerId: string): Hand {
    const hand = this.hands.get(playerId);
    if (!hand) {
      throw new Error(`Jogador ${playerId} nao possui mao nesta partida`);
    }
    return hand;
  }

  getBoard(): readonly DominoPiece[] {
    return this.board;
  }

  getBoneyardCount(): number {
    return this.boneyard.length;
  }

  getOpenEnds(): OpenEnds | null {
    if (this.board.length === 0) return null;
    return { left: this.board[0]!.left, right: this.board[this.board.length - 1]!.right };
  }

  isBlocked(): boolean {
    return this.turnManager.isBlocked();
  }

  hasValidMove(playerId: string): boolean {
    return this.moveValidator.hasAnyValidMove(this.getHand(playerId).getPieces(), this.getOpenEnds());
  }

  isPlayerHandEmpty(playerId: string): boolean {
    return this.getHand(playerId).isEmpty();
  }

  canPlay(playerId: string, pieceId: string, side: MoveSide): boolean {
    if (playerId !== this.getCurrentPlayerId()) return false;

    const hand = this.getHand(playerId);
    const piece = hand.getPieces().find((candidate) => candidate.id === pieceId);
    if (!piece) return false;

    const openEnds = this.getOpenEnds();
    if (openEnds === null) return true;

    const matchesSide = side === "left" ? piece.hasValue(openEnds.left) : piece.hasValue(openEnds.right);
    if (!matchesSide) return false;

    // Nao pode escolher um lado que fecha o jogo se o outro lado da MESMA
    // peca mantem o jogo aberto (mesma regra do servidor, DominoRules.wouldBlockGame).
    const otherSide: MoveSide = side === "left" ? "right" : "left";
    const matchesOtherSide = otherSide === "left" ? piece.hasValue(openEnds.left) : piece.hasValue(openEnds.right);
    if (matchesOtherSide) {
      const blocksChosenSide = this.wouldBlockGame(playerId, piece, side, openEnds);
      const blocksOtherSide = this.wouldBlockGame(playerId, piece, otherSide, openEnds);
      if (blocksChosenSide && !blocksOtherSide) return false;
    }

    return true;
  }

  playPiece(playerId: string, pieceId: string, side: MoveSide): void {
    if (!this.canPlay(playerId, pieceId, side)) {
      throw new Error(`Jogada invalida: jogador ${playerId}, peca ${pieceId}, lado ${side}`);
    }

    const piece = this.getHand(playerId).remove(pieceId);
    this.placeOnBoard(piece, side);
    this.turnManager.advance();
  }

  drawPiece(playerId: string): DominoPiece {
    const piece = this.boneyard.pop();
    if (!piece) {
      throw new Error("Boneyard vazio: nao ha pecas para comprar");
    }
    this.getHand(playerId).add(piece);
    return piece;
  }

  passTurn(playerId: string): void {
    if (playerId !== this.getCurrentPlayerId()) {
      throw new Error(`Nao e a vez do jogador ${playerId}`);
    }
    this.turnManager.registerPass();
  }

  // Simula a jogada e verifica se, com o tabuleiro resultante, nenhum
  // jogador (considerando as maos reais de todos - modo local tem
  // visibilidade completa) teria jogada legal.
  private wouldBlockGame(playerId: string, piece: DominoPiece, side: MoveSide, openEnds: OpenEnds): boolean {
    const newOpenEnds: OpenEnds =
      side === "left"
        ? { left: piece.getOtherEnd(openEnds.left), right: openEnds.right }
        : { left: openEnds.left, right: piece.getOtherEnd(openEnds.right) };

    for (const pid of this.playerIds) {
      const hand = this.getHand(pid).getPieces();
      const remaining = pid === playerId ? hand.filter((p) => p.id !== piece.id) : hand;
      if (this.moveValidator.hasAnyValidMove(remaining, newOpenEnds)) return false;
    }
    return true;
  }

  private placeOnBoard(piece: DominoPiece, side: MoveSide): void {
    const openEnds = this.getOpenEnds();

    if (openEnds === null) {
      this.board.push(piece);
      return;
    }

    if (side === "left") {
      const oriented = piece.right === openEnds.left ? piece : piece.flipped();
      this.board.unshift(oriented);
    } else {
      const oriented = piece.left === openEnds.right ? piece : piece.flipped();
      this.board.push(oriented);
    }
  }

  // So embaralha o baralho gerado internamente. Se um deck explicito for
  // passado no construtor (testes/replay deterministico), a ordem e respeitada.
  private shuffle(deck: DominoPiece[]): DominoPiece[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
  }
}
