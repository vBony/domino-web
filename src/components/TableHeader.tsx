import { LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export interface TableHeaderProps {
  tableLabel: string | null;
}

// So exibe metadados da mesa - nao decide nada do jogo. "Sair da Mesa" so
// navega: o unmount do PlayPage ja desmonta o GameCanvas, cujo cleanup
// (useDominoGame) destroi o Phaser.Game e isso dispara o shutdown da
// TableScene, que deixa a sala Colyseus (ver TableScene.ts).
export function TableHeader({ tableLabel }: TableHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between border-b border-border/60 px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{tableLabel ?? "Conectando..."}</h1>
        <p className="text-sm text-muted-foreground">
          Modo: <span className="text-primary">Clássico</span> · Pontos: 100
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate("/lobby")}>
          <LogOut className="h-4 w-4" />
          Sair da Mesa
        </Button>
        <Button variant="ghost" size="icon" aria-label="Configurações" onClick={() => navigate("/settings")}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
