import { CardSection } from "@/components/CardSection";
import { cn } from "@/lib/utils";

export interface GameInfoCardProps {
  currentPlayerName: string | null;
  className?: string | undefined;
}

interface InfoRowProps {
  label: string;
  value: string;
  valueClassName?: string;
}

function InfoRow({ label, value, valueClassName }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium text-foreground", valueClassName)}>{value}</span>
    </div>
  );
}

// Modo/Pontos/Rodada sao placeholder estatico: nao existe config de
// modo/pontuacao-alvo/rodadas no servidor hoje (ver discovery #4 do plano -
// Multiplas rodadas esta fora de escopo). "Jogador da vez" e o unico campo
// vindo de dado real (bridge "gameInfoChanged" do TableScene).
export function GameInfoCard({ currentPlayerName, className }: GameInfoCardProps) {
  return (
    <CardSection title="Game Info" className={className} contentClassName="flex flex-col gap-3">
      <InfoRow label="Modo" value="Clássico" valueClassName="text-primary" />
      <InfoRow label="Pontos" value="100" />
      <InfoRow label="Rodada" value="1 / 1" />
      <InfoRow label="Jogador da vez" value={currentPlayerName ?? "-"} />
    </CardSection>
  );
}
