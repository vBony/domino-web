import Phaser from "phaser";

export interface TimelinePanelViewConfig {
  width: number;
  height: number;
}

const TITLE_HEIGHT = 28;
const LINE_HEIGHT = 16;

// Painel de historico da partida (quem jogou o que, quem passou a vez,
// etc). So exibe as linhas que TableScene ja formatou em texto - nao
// decide nada sobre o jogo, so apresentacao.
export class TimelinePanelView extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly logText: Phaser.GameObjects.Text;
  private config: TimelinePanelViewConfig;

  constructor(scene: Phaser.Scene, config: TimelinePanelViewConfig) {
    super(scene, 0, 0);
    this.config = config;

    this.background = new Phaser.GameObjects.Graphics(scene);
    this.titleText = new Phaser.GameObjects.Text(scene, 10, 8, "Histórico", {
      fontSize: "13px",
      color: "#9fa8b2",
      fontStyle: "bold"
    });
    this.logText = new Phaser.GameObjects.Text(scene, 10, TITLE_HEIGHT, "", {
      fontSize: "12px",
      color: "#f5f0e6"
    });

    this.add([this.background, this.titleText, this.logText]);
    this.redrawBackground();
    scene.add.existing(this);
  }

  resize(width: number, height: number): void {
    this.config = { width, height };
    this.logText.setWordWrapWidth(width - 20);
    this.redrawBackground();
  }

  // Recebe todas as linhas ja formatadas (mais antiga primeiro) e mostra
  // so as ultimas que cabem na altura disponivel do painel.
  setEntries(lines: readonly string[]): void {
    const availableForLog = this.config.height - TITLE_HEIGHT - 8;
    const maxLines = Math.max(1, Math.floor(availableForLog / LINE_HEIGHT));
    this.logText.setText(lines.slice(-maxLines).join("\n"));
  }

  private redrawBackground(): void {
    const { width, height } = this.config;
    this.background.clear();
    this.background.fillStyle(0x1b1f24, 0.85);
    this.background.lineStyle(2, 0x3a3f47, 1);
    this.background.fillRoundedRect(0, 0, width, height, 8);
    this.background.strokeRoundedRect(0, 0, width, height, 8);
  }
}
