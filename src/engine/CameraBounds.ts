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
  minZoom: number;
  maxZoom: number;
  padding: number;
}

export class CameraBounds {
  constructor(private readonly config: CameraBoundsConfig) {}

  // Quanto maior o tabuleiro, menor o zoom necessario para caber no viewport,
  // sempre respeitando os limites minZoom/maxZoom e a folga (padding).
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
      zoom: this.clamp(idealZoom, this.config.minZoom, this.config.maxZoom),
      centerX: bounds.centerX(),
      centerY: bounds.centerY()
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
