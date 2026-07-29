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
    // A casca React (GameCanvas/useDominoGame) ja sabe o nickname do usuario
    // autenticado antes mesmo de criar o Phaser.Game, entao injeta ele no
    // registry (global ao Game) e pula direto pra TableScene - a MenuScene
    // com o form de nome so roda quando ninguem injetou nada (uso standalone
    // do jogo fora da plataforma React).
    const initialNickname = this.registry.get("initialNickname") as string | undefined;
    if (initialNickname) {
      this.scene.start(SCENE_KEYS.Table, { nickname: initialNickname });
      return;
    }

    this.scene.start(SCENE_KEYS.Menu);
  }
}
