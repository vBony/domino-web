import Phaser from "phaser";

export interface OpponentSeatViewConfig {
  width: number;
  height: number;
}

// Badge visual de um oponente: nome, contagem de pecas e cronometro. As
// pecas do oponente nunca sao desenhadas de frente aqui - so a contagem
// (DominoPieceView.setFaceDown cuida disso quando as pecas aparecem na mesa).
export class OpponentSeatView extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly pieceCountText: Phaser.GameObjects.Text;
  private readonly timerText: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private readonly config: OpponentSeatViewConfig
  ) {
    super(scene, 0, 0);

    this.background = new Phaser.GameObjects.Graphics(scene);
    this.nameText = new Phaser.GameObjects.Text(scene, 0, -config.height * 0.28, "", {
      fontSize: "13px",
      color: "#f5f0e6"
    }).setOrigin(0.5);
    this.pieceCountText = new Phaser.GameObjects.Text(scene, 0, 0, "", {
      fontSize: "16px",
      color: "#f5f0e6"
    }).setOrigin(0.5);
    this.timerText = new Phaser.GameObjects.Text(scene, 0, config.height * 0.3, "", {
      fontSize: "12px",
      color: "#9fa8b2"
    }).setOrigin(0.5);

    this.add([this.background, this.nameText, this.pieceCountText, this.timerText]);
    this.redrawBackground(false);
    scene.add.existing(this);
  }

  setSeatInfo(name: string, pieceCount: number, remainingMs: number, isCurrentTurn: boolean): void {
    this.nameText.setText(name);
    this.pieceCountText.setText(`${pieceCount} pecas`);
    this.timerText.setText(this.formatTime(remainingMs));
    this.redrawBackground(isCurrentTurn);
  }

  private redrawBackground(isCurrentTurn: boolean): void {
    const { width, height } = this.config;
    this.background.clear();
    this.background.fillStyle(0x1b1f24, 0.85);
    this.background.lineStyle(2, isCurrentTurn ? 0xffd166 : 0x3a3f47, 1);
    this.background.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    this.background.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
  }

  private formatTime(remainingMs: number): string {
    const totalSeconds = Math.max(Math.ceil(remainingMs / 1000), 0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}
