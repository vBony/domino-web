// Chaves de todas as Scenes do jogo, centralizadas para evitar strings
// magicas espalhadas (BootScene, TableScene, etc. importam daqui).
export const SCENE_KEYS = {
  Boot: "BootScene",
  Menu: "MenuScene",
  Table: "TableScene"
} as const;
