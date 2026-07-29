import { useEffect, useRef } from "react";
import { CardSection } from "@/components/CardSection";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MoveHistoryEntry } from "@scenes/TableScene";

export interface MoveHistoryCardProps {
  entries: MoveHistoryEntry[];
  className?: string | undefined;
}

function describeEntry(entry: MoveHistoryEntry): string {
  switch (entry.kind) {
    case "match_started":
      return "Partida iniciada";
    case "tile_played":
      return `${entry.playerName} jogou`;
    case "turn_passed":
      return `${entry.playerName} passou a vez`;
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Consome o evento "moveHistoryEntry" do TableScene (ver
// hooks/useDominoGame.ts) - nunca decide nada sobre o jogo, so exibe o que
// ja aconteceu. Scroll automatico pra ultima jogada via um marcador no fim
// da lista.
export function MoveHistoryCard({ entries, className }: MoveHistoryCardProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [entries.length]);

  return (
    <CardSection title="Movimentos" className={className} contentClassName="p-0">
      <ScrollArea className="h-64">
        <div className="flex flex-col gap-1 px-4 py-3">
          {entries.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma jogada ainda.</p>}
          {entries.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-2 py-1 text-sm">
              <span className="text-foreground">{describeEntry(entry)}</span>
              {entry.pieceLabel && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                  {entry.pieceLabel}
                </span>
              )}
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatTime(entry.timestamp)}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </CardSection>
  );
}
