import { Trophy } from "lucide-react";
import { cn, hashString } from "@/lib/utils";

export interface PlayerInfoProps {
  name: string;
  align?: "left" | "center" | "right";
  className?: string;
}

// Numero de trofeus e placeholder puro (nao existe no servidor hoje - ver
// discovery #4 do plano/Ranking fora de escopo): derivado do nome so pra
// nao mostrar o mesmo numero pra todo mundo.
function placeholderTrophies(name: string): number {
  return 500 + (hashString(name) % 1500);
}

export function PlayerInfo({ name, align = "center", className }: PlayerInfoProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        align === "left" && "items-start text-left",
        align === "center" && "items-center text-center",
        align === "right" && "items-end text-right",
        className
      )}
    >
      <p className="max-w-24 truncate text-sm font-medium text-foreground">{name}</p>
      <div className="flex items-center gap-1 text-xs text-amber-400">
        <Trophy className="h-3 w-3" />
        <span>{placeholderTrophies(name).toLocaleString("pt-BR")}</span>
      </div>
    </div>
  );
}
