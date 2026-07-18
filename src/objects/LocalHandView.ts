import Phaser from "phaser";
import { DominoPiece } from "@engine/DominoPiece";
import { DominoPieceView } from "./DominoPieceView";

export interface LocalHandViewConfig {
  pieceLength: number;
  pieceThickness: number;
  areaWidth: number;
}

// Renderiza a mao do jogador ativo na parte inferior da mesa, em pe (na
// vertical) via DominoPieceView.setVertical(true) - nenhuma rotacao de
// container envolvida. So desenha e repassa cliques - decidir se a jogada
// e valida e chamar o GameManager e responsabilidade de quem instancia
// esta view (a TableScene), nao dela.
export class LocalHandView extends Phaser.GameObjects.Container {
  private pieceViews: DominoPieceView[] = [];

  constructor(
    scene: Phaser.Scene,
    private config: LocalHandViewConfig,
    private readonly onPieceClicked: (piece: DominoPiece) => void
  ) {
    super(scene, 0, 0);
    scene.add.existing(this);
  }

  setAreaWidth(areaWidth: number): void {
    this.config = { ...this.config, areaWidth };
    this.layoutPieces();
  }

  setHand(pieces: readonly DominoPiece[]): void {
    this.pieceViews.forEach((view) => view.destroy());
    this.pieceViews = pieces.map((piece) => this.createPieceView(piece));
    this.layoutPieces();
  }

  private createPieceView(piece: DominoPiece): DominoPieceView {
    const { pieceLength, pieceThickness } = this.config;

    const view = new DominoPieceView(this.scene, piece, {
      length: pieceLength,
      thickness: pieceThickness
    });
    view.setVertical(true);

    view.setInteractive(
      new Phaser.Geom.Rectangle(-pieceThickness / 2, -pieceLength / 2, pieceThickness, pieceLength),
      Phaser.Geom.Rectangle.Contains
    );
    view.on("pointerdown", () => this.onPieceClicked(piece));

    this.add(view);
    return view;
  }

  private layoutPieces(): void {
    const count = this.pieceViews.length;
    if (count === 0) return;

    const spacing = Math.min(this.config.pieceThickness * 1.3, this.config.areaWidth / count);
    const startX = -(spacing * (count - 1)) / 2;

    this.pieceViews.forEach((view, index) => {
      view.setPosition(startX + spacing * index, 0);
    });
  }
}
