import { RefObject } from "react";

interface GameCanvasProps {
  containerRef: RefObject<HTMLDivElement | null>;
}

// Componente "burro": so a div-container onde o Phaser.Game e montado (ver
// hooks/useDominoGame.ts). Nunca desenha nada do jogo por conta propria.
export function GameCanvas({ containerRef }: GameCanvasProps) {
  return <div ref={containerRef} className="absolute inset-0" />;
}
