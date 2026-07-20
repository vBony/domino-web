import Phaser from "phaser";
import { BootScene } from "@scenes/BootScene";
import { MenuScene } from "@scenes/MenuScene";
import { TableScene } from "@scenes/TableScene";

// Configuracao pura do Phaser (renderer, escala, resolucao). Scenes sao
// registradas aqui conforme forem criadas, na ordem em que devem rodar.
export const PHASER_GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#0f0f12",
  scale: {
    // RESIZE + LayoutManager (a criar) cuidam da responsividade real,
    // em vez de depender do FIT/ENVELOPE automatico do Phaser.
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    pixelArt: false
  },
  // Necessario para GameObjects.DOMElement (campo de nome real na
  // MenuScene) - sem isso this.add.dom() nao tem onde montar o elemento.
  dom: {
    createContainer: true
  },
  scene: [BootScene, MenuScene, TableScene]
};
