import { BoardBounds } from "./BoardBounds";

// Calculo puro de enquadramento de camera a partir da bounding box do
// tabuleiro. Nao toca em Phaser.Cameras - apenas devolve numeros que um
// CameraManager (camada Phaser, em managers/) aplicara futuramente.
export interface Viewport {
  width: number;
  height: number;
}

export interface CameraFit {
  zoom: number;
  centerX: number;
  centerY: number;
}

export interface CameraBoundsConfig {
  maxZoom: number;
  padding: number;
}

export class CameraBounds {
  constructor(private readonly config: CameraBoundsConfig) {}

  // Quanto maior o tabuleiro, menor o zoom necessario para caber no viewport.
  // So respeita um teto (maxZoom, pra nao ampliar alem do tamanho natural
  // quando o tabuleiro e pequeno) - nao existe piso: um tabuleiro que
  // exigisse encolher mais do que isso simplesmente encolhe mais, porque a
  // cobra pode crescer bastante num sentido so sem virar (BoardLayout so
  // vira em duplas - ver comentario la). Um piso de zoom aqui ja causou o
  // tabuleiro invadir o badge do oponente de cima quando a cobra ficava
  // maior do que o piso permitia encolher - "caber" tem que caber sempre.
  calculateFit(bounds: BoardBounds, viewport: Viewport): CameraFit {
    if (bounds.isEmpty()) {
      return { zoom: this.config.maxZoom, centerX: 0, centerY: 0 };
    }

    const contentWidth = bounds.width() + this.config.padding * 2;
    const contentHeight = bounds.height() + this.config.padding * 2;

    const zoomToFitWidth = viewport.width / contentWidth;
    const zoomToFitHeight = viewport.height / contentHeight;
    const idealZoom = Math.min(zoomToFitWidth, zoomToFitHeight);

    return {
      zoom: Math.min(idealZoom, this.config.maxZoom),
      centerX: bounds.centerX(),
      centerY: bounds.centerY()
    };
  }
}
