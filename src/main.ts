import Phaser from "phaser";
import { PHASER_GAME_CONFIG } from "@config/gameConfig";

// Ponto de entrada da aplicacao. Apenas inicializa o Phaser.Game
// com a config declarada em @config/gameConfig. Nenhuma logica de jogo aqui.
new Phaser.Game(PHASER_GAME_CONFIG);
