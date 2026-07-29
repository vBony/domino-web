import Phaser from "phaser";
import { DominoPiece } from "@engine/DominoPiece";
import { PlacedPiece } from "@engine/BoardLayout";

export interface DominoPieceViewConfig {
  length: number;
  thickness: number;
  worldToPixelScale?: number;
}

// Posicoes relativas (-1,0,1) num grid 3x3, para os padroes classicos de pip.
const PIP_LAYOUTS: Readonly<Record<number, ReadonlyArray<readonly [number, number]>>> = {
  0: [],
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]
};

// Representacao visual de uma DominoPiece. So desenha o que a engine ja
// calculou (valores via DominoPiece, x/y/orientacao via BoardLayout) -
// nenhuma regra de jogo vive aqui, so apresentacao.
//
// A orientacao (deitada ou em pe) e resolvida com setVertical(), nunca com
// uma rotacao de Container: numa peca de domino real, cada metade sempre
// "le" os pips na mesma orientacao, esteja a peca deitada ou em pe. Girar
// o Container giraria os pips junto (ex: o 6 viraria 3 colunas de 2 em vez
// de 2 colunas de 3), o que e visualmente errado tanto na mao quanto na mesa.
export class DominoPieceView extends Phaser.GameObjects.Container {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private faceDown = false;
  private isVertical = false;
  private reversed = false;

  constructor(
    scene: Phaser.Scene,
    private readonly piece: DominoPiece,
    private readonly config: DominoPieceViewConfig
  ) {
    super(scene, 0, 0);
    this.graphics = new Phaser.GameObjects.Graphics(scene);
    this.add(this.graphics);
    this.redraw();
    scene.add.existing(this);
  }

  getPiece(): DominoPiece {
    return this.piece;
  }

  setFaceDown(faceDown: boolean): void {
    if (this.faceDown === faceDown) return;
    this.faceDown = faceDown;
    this.redraw();
  }

  setVertical(isVertical: boolean): void {
    if (this.isVertical === isVertical) return;
    this.isVertical = isVertical;
    this.redraw();
  }

  // true quando as metades fisicas devem trocar de valor para a metade
  // que encosta na vizinha mostrar o valor certo - ver PlacedPiece.reversed.
  setReversed(reversed: boolean): void {
    if (this.reversed === reversed) return;
    this.reversed = reversed;
    this.redraw();
  }

  // Aplica a posicao/orientacao ja calculadas pelo BoardLayout (engine),
  // convertendo unidades de mundo para pixels de tela. rotation !== 0
  // significa "peca em pe" (perpendicular ao fluxo da cadeia nesse trecho).
  applyPlacement(placed: PlacedPiece): void {
    const scale = this.config.worldToPixelScale ?? 1;
    this.setPosition(placed.x * scale, placed.y * scale);
    this.setReversed(placed.reversed);
    this.setVertical(placed.rotation !== 0);
  }

  private redraw(): void {
    const width = this.isVertical ? this.config.thickness : this.config.length;
    const height = this.isVertical ? this.config.length : this.config.thickness;
    const halfW = width / 2;
    const halfH = height / 2;

    this.graphics.clear();
    this.graphics.fillStyle(this.faceDown ? 0x1d3557 : 0xf5f0e6, 1);
    this.graphics.lineStyle(2, 0x0d0d0f, 1);
    this.graphics.fillRoundedRect(-halfW, -halfH, width, height, 6);
    this.graphics.strokeRoundedRect(-halfW, -halfH, width, height, 6);

    if (this.faceDown) return;

    this.graphics.lineStyle(2, 0x0d0d0f, 0.6);

    // A divisoria muda de eixo conforme a peca esta deitada ou em pe, mas o
    // desenho dos pips (ex: o 6 em duas colunas de tres) nunca gira junto -
    // ele so e reposicionado para caber na metade certa.
    //
    // this.reversed inverte qual metade fisica mostra qual valor: o valor
    // que conecta com o vizinho ja colocado precisa aparecer na metade
    // voltada para ele, e isso depende da ponta da cadeia e do sentido do
    // trecho na cobra bilateral - quem decide e o BoardLayout (ver
    // PlacedPiece.reversed); aqui so se aplica a troca.
    const [firstValue, secondValue] = this.reversed
      ? [this.piece.right, this.piece.left]
      : [this.piece.left, this.piece.right];

    if (this.isVertical) {
      this.graphics.lineBetween(-halfW, 0, halfW, 0);
      this.drawHalf(firstValue, { x: 0, y: -halfH / 2 }, { x: halfW, y: halfH / 2 });
      this.drawHalf(secondValue, { x: 0, y: halfH / 2 }, { x: halfW, y: halfH / 2 });
    } else {
      this.graphics.lineBetween(0, -halfH, 0, halfH);
      this.drawHalf(firstValue, { x: -halfW / 2, y: 0 }, { x: halfW / 2, y: halfH });
      this.drawHalf(secondValue, { x: halfW / 2, y: 0 }, { x: halfW / 2, y: halfH });
    }
  }

  // center: onde fica o centro dessa metade. halfExtent: espaco disponivel
  // para os pips em cada eixo (cheio no eixo que NAO esta dividido, metade
  // no eixo dividido) - e o que garante que o padrao de pips nunca se deite
  // ou fique de pe conforme a orientacao da peca, so a divisoria muda.
  private drawHalf(
    value: number,
    center: { x: number; y: number },
    halfExtent: { x: number; y: number }
  ): void {
    const positions = PIP_LAYOUTS[value] ?? [];
    const spacingX = halfExtent.x * 0.55;
    const spacingY = halfExtent.y * 0.55;
    const pipRadius = Math.min(spacingX, spacingY) * 0.35;

    this.graphics.fillStyle(0x0d0d0f, 1);
    for (const [gx, gy] of positions) {
      this.graphics.fillCircle(center.x + gx * spacingX, center.y + gy * spacingY, pipRadius);
    }
  }
}
