import { Dices } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LogoProps {
  className?: string;
  textClassName?: string;
}

export function Logo({ className, textClassName }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Dices className="h-5 w-5" />
      </div>
      <div className={cn("leading-tight", textClassName)}>
        <p className="text-sm font-semibold text-foreground">Domino</p>
        <p className="text-sm font-semibold text-primary -mt-0.5">Online</p>
      </div>
    </div>
  );
}
