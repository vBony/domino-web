import { GameCanvas } from "@/components/GameCanvas";
import { GameInfoCard } from "@/components/GameInfoCard";
import { MoveHistoryCard } from "@/components/MoveHistoryCard";
import { TableHeader } from "@/components/TableHeader";
import { TableSeatsOverlay } from "@/components/TableSeatsOverlay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useDominoGame } from "@/hooks/useDominoGame";

// Composicao da tela principal do mockup: header + mesa (Phaser + overlay
// React de avatares) + painel lateral (desktop/tablet) ou tabs abaixo da
// mesa (mobile). ProtectedRoute garante `user` autenticado antes desta rota
// renderizar.
export function PlayPage() {
  const { user } = useAuth();
  const { containerRef, tableLabel, players, moveHistory, gameInfo, layoutRects } = useDominoGame(
    user?.nickname ?? ""
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <TableHeader tableLabel={tableLabel} />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative min-h-0 flex-1">
          <GameCanvas containerRef={containerRef} />
          <TableSeatsOverlay layoutRects={layoutRects} players={players} />
        </div>

        <aside className="hidden w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border/60 p-4 lg:flex">
          <GameInfoCard currentPlayerName={gameInfo.currentPlayerName} />
          <MoveHistoryCard entries={moveHistory} />
        </aside>

        <div className="shrink-0 border-t border-border/60 p-3 pb-4 lg:hidden">
          <Tabs defaultValue="moves">
            <TabsList className="w-full">
              <TabsTrigger value="moves">Movimentos</TabsTrigger>
              <TabsTrigger value="info">Informações</TabsTrigger>
            </TabsList>
            <TabsContent value="moves">
              <MoveHistoryCard entries={moveHistory} />
            </TabsContent>
            <TabsContent value="info">
              <GameInfoCard currentPlayerName={gameInfo.currentPlayerName} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
