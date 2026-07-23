import Phaser from "phaser";
import { SCENE_KEYS } from "@config/sceneKeys";

const MAX_NICKNAME_LENGTH = 20;

// Tela padrao ao entrar no site: um botao "Jogar" que revela um campo de
// nome (DOMElement real - teclado/cursor nativos, sem reinventar input
// dentro do canvas). Ao confirmar, inicia a TableScene passando o nome
// escolhido via scene data (era um window.prompt antes).
export class MenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private playButtonBg!: Phaser.GameObjects.Graphics;
  private playButtonLabel!: Phaser.GameObjects.Text;
  private nameForm!: Phaser.GameObjects.DOMElement;

  constructor() {
    super(SCENE_KEYS.Menu);
  }

  create(): void {
    this.titleText = this.add.text(0, 0, "Dominó", { fontSize: "48px", color: "#f5f0e6", fontStyle: "bold" }).setOrigin(0.5);

    this.buildPlayButton();
    this.buildNameForm();
    this.reposition();

    const onResize = () => this.reposition();
    this.scale.on("resize", onResize);
    this.events.once("shutdown", () => this.scale.off("resize", onResize));
  }

  private buildPlayButton(): void {
    const width = 200;
    const height = 56;
    const halfW = width / 2;
    const halfH = height / 2;

    this.playButtonBg = this.add.graphics();
    this.playButtonBg.fillStyle(0x1b1f24, 1);
    this.playButtonBg.lineStyle(2, 0xffd166, 1);
    this.playButtonBg.fillRoundedRect(-halfW, -halfH, width, height, 10);
    this.playButtonBg.strokeRoundedRect(-halfW, -halfH, width, height, 10);
    this.playButtonBg.setInteractive(
      new Phaser.Geom.Rectangle(-halfW, -halfH, width, height),
      Phaser.Geom.Rectangle.Contains
    );
    this.playButtonBg.on("pointerdown", () => this.showNameForm());

    this.playButtonLabel = this.add.text(0, 0, "Jogar", { fontSize: "22px", color: "#f5f0e6" }).setOrigin(0.5);
  }

  private buildNameForm(): void {
    const html = `
      <div style="display:flex; flex-direction:column; align-items:center; gap:12px; font-family:monospace;">
        <input id="nickname-input" type="text" maxlength="${MAX_NICKNAME_LENGTH}" placeholder="Seu nome"
          style="padding:10px 14px; font-size:16px; border-radius:8px; border:2px solid #3a3f47;
          background:#1b1f24; color:#f5f0e6; text-align:center; width:220px; outline:none;" />
        <button id="nickname-confirm" type="button"
          style="padding:10px 24px; font-size:16px; border-radius:8px; border:2px solid #ffd166;
          background:#1b1f24; color:#f5f0e6; cursor:pointer;">Entrar</button>
      </div>
    `;

    this.nameForm = this.add.dom(0, 0).createFromHTML(html);
    this.nameForm.setVisible(false);

    this.nameForm.addListener("click");
    this.nameForm.on("click", (event: MouseEvent) => {
      if ((event.target as HTMLElement | null)?.id === "nickname-confirm") this.confirmName();
    });

    this.nameForm.addListener("keydown");
    this.nameForm.on("keydown", (event: KeyboardEvent) => {
      if (event.key === "Enter") this.confirmName();
    });
  }

  private showNameForm(): void {
    this.playButtonBg.setVisible(false).disableInteractive();
    this.playButtonLabel.setVisible(false);
    this.nameForm.setVisible(true);

    const input = this.nameForm.getChildByID("nickname-input") as HTMLInputElement | null;
    input?.focus();
  }

  private confirmName(): void {
    const input = this.nameForm.getChildByID("nickname-input") as HTMLInputElement | null;
    const nickname = input?.value.trim();
    this.scene.start(SCENE_KEYS.Table, nickname ? { nickname } : {});
  }

  private reposition(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.titleText.setPosition(centerX, centerY - 80);
    this.playButtonBg.setPosition(centerX, centerY + 20);
    this.playButtonLabel.setPosition(centerX, centerY + 20);
    this.nameForm.setPosition(centerX, centerY + 20);
  }
}
