import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, hashString } from "@/lib/utils";

const PALETTE = [
  "bg-rose-500/20 text-rose-300",
  "bg-amber-500/20 text-amber-300",
  "bg-emerald-500/20 text-emerald-300",
  "bg-sky-500/20 text-sky-300",
  "bg-violet-500/20 text-violet-300",
  "bg-pink-500/20 text-pink-300"
];

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base"
} as const;

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export interface PlayerAvatarProps {
  name: string;
  size?: keyof typeof SIZE_CLASSES;
  isCurrentTurn?: boolean;
  isLocal?: boolean;
  connected?: boolean;
  className?: string;
}

// Sem foto real de perfil (nao existe esse dado no servidor hoje - ver
// discovery #4 do plano): identidade visual e um circulo com iniciais,
// cor derivada do nome de forma deterministica.
export function PlayerAvatar({
  name,
  size = "md",
  isCurrentTurn = false,
  isLocal = false,
  connected = true,
  className
}: PlayerAvatarProps) {
  const palette = PALETTE[hashString(name) % PALETTE.length];

  return (
    <div className={cn("relative shrink-0", className)}>
      <Avatar
        className={cn(
          SIZE_CLASSES[size],
          "ring-2 ring-offset-2 ring-offset-background transition-colors",
          isCurrentTurn ? "ring-primary" : isLocal ? "ring-primary/40" : "ring-transparent"
        )}
      >
        <AvatarFallback className={cn("font-semibold", palette)}>{initialsFor(name)}</AvatarFallback>
      </Avatar>
      <span
        className={cn(
          "absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-background",
          connected ? "bg-emerald-400" : "bg-muted-foreground/50"
        )}
      />
    </div>
  );
}
