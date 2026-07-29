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
  // So respeita um teto (maxZoom, pra nao ampliar demais quando o tabuleiro
  // e pequeno) - nao existe piso: o BoardLayout ja espirala para manter a
  // cobra dentro da area util, entao o zoom so cai abaixo de 1 quando a
  // espiral realmente esgota (escala de alivio) - e nesse caso "caber" tem
  // que caber sempre. Um piso de zoom aqui ja causou o tabuleiro invadir o
  // badge do oponente de cima.
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
