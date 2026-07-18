export type Orientation = "portrait" | "landscape";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type VisualSlot = "bottom" | "right" | "top" | "left";
export type OpponentSlot = Exclude<VisualSlot, "bottom">;

export interface LayoutSchema {
  orientation: Orientation;
  topBar: Rect;
  boardArea: Rect;
  localHandArea: Rect;
  opponentSlots: Record<OpponentSlot, Rect>;
  chatPanel: Rect;
}

export interface Viewport {
  width: number;
  height: number;
}

const TOP_BAR_RATIO = 0.08;

// Calcula onde cada elemento de HUD/mesa deve ficar, dado o tamanho atual
// da tela. Puramente matematico (sem Phaser), para poder ser testado sem
// canvas - a TableScene so aplica os Rects calculados aqui em GameObjects.
export class LayoutManager {
  compute(viewport: Viewport): LayoutSchema {
    return viewport.width >= viewport.height
      ? this.computeLandscape(viewport)
      : this.computePortrait(viewport);
  }

  // Mapeia os 4 assentos (0-3) para os slots visuais ao redor da mesa,
  // sempre no sentido horario a partir de quem deve aparecer embaixo.
  mapSeatsToSlots(bottomSeatIndex: number, totalSeats: number): Record<number, VisualSlot> {
    const slots: VisualSlot[] = ["bottom", "left", "top", "right"];
    const mapping: Record<number, VisualSlot> = {};

    for (let offset = 0; offset < totalSeats; offset++) {
      const seatIndex = (bottomSeatIndex + offset) % totalSeats;
      mapping[seatIndex] = slots[offset % slots.length]!;
    }

    return mapping;
  }

  private computeLandscape(viewport: Viewport): LayoutSchema {
    const topBarHeight = viewport.height * TOP_BAR_RATIO;
    const chatWidth = viewport.width * 0.18;
    const sideStripWidth = viewport.width * 0.1;
    const handHeight = viewport.height * 0.2;
    const contentWidth = viewport.width - sideStripWidth * 2 - chatWidth;
    const contentHeight = viewport.height - topBarHeight - handHeight;

    return {
      orientation: "landscape",
      topBar: { x: 0, y: 0, width: viewport.width, height: topBarHeight },
      boardArea: { x: sideStripWidth, y: topBarHeight, width: contentWidth, height: contentHeight },
      localHandArea: {
        x: sideStripWidth,
        y: viewport.height - handHeight,
        width: contentWidth,
        height: handHeight
      },
      chatPanel: {
        x: viewport.width - chatWidth,
        y: topBarHeight,
        width: chatWidth,
        height: viewport.height - topBarHeight
      },
      opponentSlots: {
        top: { x: sideStripWidth, y: topBarHeight, width: contentWidth, height: contentHeight * 0.16 },
        left: { x: 0, y: topBarHeight, width: sideStripWidth, height: contentHeight },
        right: { x: viewport.width - chatWidth - sideStripWidth, y: topBarHeight, width: sideStripWidth, height: contentHeight }
      }
    };
  }

  private computePortrait(viewport: Viewport): LayoutSchema {
    const topBarHeight = viewport.height * TOP_BAR_RATIO;
    const handHeight = viewport.height * 0.22;
    const sideBadgeWidth = viewport.width * 0.16;
    const chatHeight = viewport.height * 0.12;
    const boardHeight = viewport.height - topBarHeight - handHeight - chatHeight;
    const boardWidth = viewport.width - sideBadgeWidth * 2;

    return {
      orientation: "portrait",
      topBar: { x: 0, y: 0, width: viewport.width, height: topBarHeight },
      boardArea: { x: sideBadgeWidth, y: topBarHeight, width: boardWidth, height: boardHeight },
      localHandArea: { x: 0, y: viewport.height - handHeight, width: viewport.width, height: handHeight },
      chatPanel: {
        x: 0,
        y: viewport.height - handHeight - chatHeight,
        width: viewport.width,
        height: chatHeight
      },
      opponentSlots: {
        top: { x: sideBadgeWidth, y: topBarHeight, width: boardWidth, height: boardHeight * 0.18 },
        left: { x: 0, y: topBarHeight, width: sideBadgeWidth, height: boardHeight * 0.18 },
        right: { x: viewport.width - sideBadgeWidth, y: topBarHeight, width: sideBadgeWidth, height: boardHeight * 0.18 }
      }
    };
  }
}
