import Phaser from "phaser";
import { SCENE_KEYS } from "@config/sceneKeys";

// Scene inicial: hoje nao ha assets reais para carregar (sprites/atlas/sons
// virao depois), entao preload() existe apenas como ponto de extensao ja
// pronto. Nenhuma regra de jogo aqui - so ciclo de vida do Phaser.
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.Boot);
  }

  preload(): void {
    // TODO: carregar sprites/atlas de pecas, fontes e efeitos sonoros
    // (jogar peca, comprar, vencer, perder) quando os assets existirem.
  }

  create(): void {
    this.scene.start(SCENE_KEYS.Menu);
  }
}
