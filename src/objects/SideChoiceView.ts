import Phaser from "phaser";
import { MoveSide } from "@engine/MoveValidator";

export interface SideChoiceViewConfig {
  buttonWidth: number;
  buttonHeight: number;
  gap: number;
}

interface ButtonParts {
  background: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
}

// Prompt "em qual ponta jogar?": aparece so quando a peca clicada encaixa
// nos dois lados abertos do tabuleiro (ver TableScene.handleLocalPieceClicked).
// So mostra o que ja foi decidido (quais valores cada ponta tem) e repassa
// o clique - nao decide nada sobre regra de jogo.
export class SideChoiceView extends Phaser.GameObjects.Container {
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly leftButton: ButtonParts;
  private readonly rightButton: ButtonParts;

  constructor(
    scene: Phaser.Scene,
    private readonly config: SideChoiceViewConfig,
    private readonly onChoose: (side: MoveSide) => void
  ) {
    super(scene, 0, 0);

    this.titleText = new Phaser.GameObjects.Text(scene, 0, -config.buttonHeight, "Jogar em qual ponta?", {
      fontSize: "14px",
      color: "#f5f0e6"
    }).setOrigin(0.5);

    this.leftButton = this.createButton(scene, -(config.buttonWidth + config.gap) / 2, "left");
    this.rightButton = this.createButton(scene, (config.buttonWidth + config.gap) / 2, "right");

    this.add([this.titleText, this.leftButton.background, this.leftButton.label, this.rightButton.background, this.rightButton.label]);
    scene.add.existing(this);
    this.hide();
  }

  showFor(openEnds: { left: number; right: number }): void {
    this.leftButton.label.setText(`◀ Esquerda (${openEnds.left})`);
    this.rightButton.label.setText(`Direita (${openEnds.right}) ▶`);
    this.setVisible(true);
    this.leftButton.background.setInteractive();
    this.rightButton.background.setInteractive();
  }

  // Desliga o hit-test dos botoes junto com a visibilidade - a visibilidade
  // do Container por si so nao garante que os filhos parem de responder a
  // clique (o Container so deixa de renderizar), entao sem isso os botoes
  // continuariam clicaveis "invisiveis" enquanto o prompt esta escondido.
  hide(): void {
    this.setVisible(false);
    this.leftButton.background.disableInteractive();
    this.rightButton.background.disableInteractive();
  }

  private createButton(scene: Phaser.Scene, offsetX: number, side: MoveSide): ButtonParts {
    const { buttonWidth, buttonHeight } = this.config;
    const halfW = buttonWidth / 2;
    const halfH = buttonHeight / 2;

    const background = new Phaser.GameObjects.Graphics(scene);
    background.fillStyle(0x1b1f24, 0.95);
    background.lineStyle(2, 0xffd166, 1);
    background.fillRoundedRect(-halfW, -halfH, buttonWidth, buttonHeight, 8);
    background.strokeRoundedRect(-halfW, -halfH, buttonWidth, buttonHeight, 8);
    background.setPosition(offsetX, 0);

    const label = new Phaser.GameObjects.Text(scene, offsetX, 0, "", {
      fontSize: "14px",
      color: "#f5f0e6"
    }).setOrigin(0.5);

    background.setInteractive(
      new Phaser.Geom.Rectangle(-halfW, -halfH, buttonWidth, buttonHeight),
      Phaser.Geom.Rectangle.Contains
    );
    background.on("pointerdown", () => this.onChoose(side));

    return { background, label };
  }
}
