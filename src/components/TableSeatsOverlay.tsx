import type { TableLayoutRects, TableSeatPlayer, TableSeatSlot } from "@scenes/TableScene";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerInfo } from "@/components/PlayerInfo";
import { Badge } from "@/components/ui/badge";

interface TableSeatsOverlayProps {
  layoutRects: TableLayoutRects | null;
  players: TableSeatPlayer[];
}

function seatCenter(rects: TableLayoutRects, slot: TableSeatSlot): { x: number; y: number } {
  if (slot === "bottom") {
    return { x: rects.localHandArea.x + rects.localHandArea.width / 2, y: rects.localHandArea.y - 44 };
  }
  const rect = rects.opponentSlots[slot];
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

// Overlay HTML por cima do canvas do Phaser: desenha avatar/nome/trofeu/
// contagem de pecas/turno pra cada um dos 4 assentos, posicionado pelos
// MESMOS rects que o LayoutManager (Phaser) ja calcula - ver evento
// "layoutChanged" em TableScene. Nunca desenha tabuleiro/pecas/mao (isso
// continua 100% Phaser).
export function TableSeatsOverlay({ layoutRects, players }: TableSeatsOverlayProps) {
  if (!layoutRects) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      {players.map((player) => {
        const point = seatCenter(layoutRects, player.seatSlot);
        return (
          <div
            key={player.id}
            className="absolute flex w-24 flex-col items-center gap-1.5"
            style={{
              // clamp() em vez de so `left: point.x` - assentos top/left/
              // right ficam perto da borda em telas estreitas (mobile) e o
              // chip (w-24) centralizado exatamente no rect vazava pra fora
              // da viewport. Os 48px sao metade do w-24.
              left: `clamp(48px, ${point.x}px, calc(100% - 48px))`,
              top: point.y,
              transform: "translate(-50%, -50%)"
            }}
          >
            <PlayerAvatar
              name={player.name}
              isCurrentTurn={player.isCurrentTurn}
              isLocal={player.isLocal}
              connected={player.connected}
            />
            <PlayerInfo name={player.isLocal ? "Você" : player.name} />
            <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-normal">
              {player.tilesCount}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
