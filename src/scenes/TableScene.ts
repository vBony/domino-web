import Phaser from "phaser";
import { SCENE_KEYS } from "@config/sceneKeys";
import { LOCAL_MODE } from "@config/localMode";
import { Player } from "@engine/Player";
import { DominoPiece } from "@engine/DominoPiece";
import { DominoRules, STANDARD_DOUBLE_SIX_RULES } from "@engine/DominoRules";
import { BoardLayout } from "@engine/BoardLayout";
import { CameraBounds } from "@engine/CameraBounds";
import { GameManager } from "@managers/GameManager";
import { LayoutManager, OpponentSlot, Rect, VisualSlot } from "@managers/LayoutManager";
import { MockNetworkService } from "@network/MockNetworkService";
import { DominoPieceView } from "@objects/DominoPieceView";
import { OpponentSeatView } from "@objects/OpponentSeatView";
import { LocalHandView } from "@objects/LocalHandView";

const PIECE_LENGTH = 64;
const PIECE_WIDTH = 32;
const OPPONENT_SLOTS: readonly OpponentSlot[] = ["top", "left", "right"];

// Scene principal: orquestra GameManager (estado/eventos), LayoutManager
// (posicoes responsivas) e as views (DominoPieceView/OpponentSeatView/
// LocalHandView). Nao decide regra de jogo nem calcula layout - so aplica
// o que essas camadas ja calcularam.
export class TableScene extends Phaser.Scene {
  private readonly layoutManager = new LayoutManager();
  private readonly boardLayout = new BoardLayout({
    pieceLength: PIECE_LENGTH,
    pieceWidth: PIECE_WIDTH,
    maxSegmentLength: 480
  });
  private readonly cameraBounds = new CameraBounds({ minZoom: 0.4, maxZoom: 1, padding: 60 });

  private gameManager!: GameManager;
  private players: Player[] = [];
  private boardContainer!: Phaser.GameObjects.Container;
  private readonly boardPieceViews = new Map<string, DominoPieceView>();
  private localHandView!: LocalHandView;
  private opponentViews = {} as Record<OpponentSlot, OpponentSeatView>;
  private topBarText!: Phaser.GameObjects.Text;
  private boardArea: Rect = { x: 0, y: 0, width: 0, height: 0 };

  constructor() {
    super(SCENE_KEYS.Table);
  }

  create(): void {
    this.setupGameManager();
    this.buildStaticVisuals();
    this.gameManager.startMatch();

    this.applyLayout();
    this.refreshHands();
    this.refreshTopBar();

    this.gameManager.events.on("stateChanged", () => this.refresh());
    this.scale.on("resize", () => this.applyLayout());
  }

  override update(_time: number, delta: number): void {
    this.gameManager.getTimerService().tick(delta);
    this.updateOpponentBadges();
  }

  private setupGameManager(): void {
    this.players = [0, 1, 2, 3].map((seat) => new Player(`player-${seat}`, `Jogador ${seat + 1}`, seat));
    const rules = new DominoRules(STANDARD_DOUBLE_SIX_RULES);
    const networkService = new MockNetworkService();

    this.gameManager = new GameManager(this.players, rules, networkService, this.players[0]!.id, {
      targetScore: 100
    });
  }

  private buildStaticVisuals(): void {
    this.boardContainer = this.add.container(0, 0);

    this.topBarText = this.add.text(0, 0, "", { fontSize: "16px", color: "#f5f0e6" }).setOrigin(0, 0.5);

    this.localHandView = new LocalHandView(
      this,
      { pieceLength: PIECE_LENGTH * 1.4, pieceThickness: PIECE_WIDTH * 1.4, areaWidth: 600 },
      (piece) => this.handleLocalPieceClicked(piece)
    );

    for (const slot of OPPONENT_SLOTS) {
      this.opponentViews[slot] = new OpponentSeatView(this, { width: 130, height: 70 });
    }
  }

  private applyLayout(): void {
    const schema = this.layoutManager.compute({ width: this.scale.width, height: this.scale.height });
    this.boardArea = schema.boardArea;

    this.topBarText.setPosition(schema.topBar.x + 16, schema.topBar.y + schema.topBar.height / 2);

    this.localHandView.setPosition(
      schema.localHandArea.x + schema.localHandArea.width / 2,
      schema.localHandArea.y + schema.localHandArea.height / 2
    );
    this.localHandView.setAreaWidth(schema.localHandArea.width * 0.94);

    for (const slot of OPPONENT_SLOTS) {
      const rect = schema.opponentSlots[slot];
      this.opponentViews[slot].setPosition(rect.x + rect.width / 2, rect.y + rect.height / 2);
    }

    this.refreshBoard();
  }

  private refresh(): void {
    this.refreshBoard();
    this.refreshHands();
    this.refreshTopBar();
  }

  private refreshBoard(): void {
    const game = this.gameManager.getCurrentGame();
    const placedPieces = this.boardLayout.computeLayout(game.getBoard());

    // Peca por id, nao por indice: jogar no lado esquerdo da cadeia faz
    // unshift no array do GameState, entao o indice de cada peca dentro
    // dele muda a cada rodada. Associar view por posicao (array simples)
    // fazia a view errada (peca antiga) ser reposicionada onde uma peca
    // diferente deveria estar. O id da peca e estavel, entao o cache por
    // id sempre aplica o placement certo na view certa.
    for (const placed of placedPieces) {
      let view = this.boardPieceViews.get(placed.piece.id);
      if (!view) {
        view = new DominoPieceView(this, placed.piece, {
          length: PIECE_LENGTH,
          thickness: PIECE_WIDTH
        });
        this.boardContainer.add(view);
        this.boardPieceViews.set(placed.piece.id, view);
      }
      view.applyPlacement(placed);
    }

    const bounds = this.boardLayout.computeBounds(placedPieces);
    const fit = this.cameraBounds.calculateFit(bounds, {
      width: this.boardArea.width,
      height: this.boardArea.height
    });

    this.boardContainer.setScale(fit.zoom);
    this.boardContainer.setPosition(
      this.boardArea.x + this.boardArea.width / 2 - fit.centerX * fit.zoom,
      this.boardArea.y + this.boardArea.height / 2 - fit.centerY * fit.zoom
    );
  }

  private refreshHands(): void {
    const bottomPlayerId = this.getBottomPlayerId();
    this.localHandView.setHand(this.gameManager.getCurrentGame().getHand(bottomPlayerId).getPieces());
    this.updateOpponentBadges();
  }

  private refreshTopBar(): void {
    const game = this.gameManager.getCurrentGame();
    const currentPlayer = this.players.find((player) => player.id === game.getCurrentPlayerId());
    this.topBarText.setText(
      `Sala Local  |  Rodada ${this.gameManager.getReplayManager().getRounds().length}  |  ` +
        `Vez de: ${currentPlayer?.name ?? "-"}  |  Boneyard: ${game.getBoneyardCount()}`
    );
  }

  private updateOpponentBadges(): void {
    if (!this.gameManager) return;

    const game = this.gameManager.getCurrentGame();
    const seatToSlot = this.getSeatToSlotMapping();

    for (const player of this.players) {
      const slot = seatToSlot[player.seat];
      if (!slot || slot === "bottom") continue;

      this.opponentViews[slot].setSeatInfo(
        player.name,
        game.getHand(player.id).count(),
        this.gameManager.getTimerService().getRemaining(player.id),
        game.getCurrentPlayerId() === player.id
      );
    }
  }

  private getBottomPlayerId(): string {
    const game = this.gameManager.getCurrentGame();
    return LOCAL_MODE ? game.getCurrentPlayerId() : this.players[0]!.id;
  }

  private getSeatToSlotMapping(): Record<number, VisualSlot> {
    const bottomPlayerId = this.getBottomPlayerId();
    const bottomSeat = this.players.find((player) => player.id === bottomPlayerId)!.seat;
    return this.layoutManager.mapSeatsToSlots(bottomSeat, this.players.length);
  }

  private handleLocalPieceClicked(piece: DominoPiece): void {
    const activePlayerId = this.getBottomPlayerId();
    const side = this.gameManager.getPlayableSide(activePlayerId, piece.id);
    if (!side) return;

    this.gameManager.playPiece(activePlayerId, piece.id, side);
  }
}
