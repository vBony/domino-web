import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface CardSectionProps {
  title: string;
  action?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
  contentClassName?: string | undefined;
}

// Wrapper fino sobre o Card do shadcn: titulo + acao opcional no header,
// conteudo livre embaixo. Usado por GameInfoCard e MoveHistoryCard pra nao
// repetir o mesmo header/padding nos dois.
export function CardSection({ title, action, children, className, contentClassName }: CardSectionProps) {
  return (
    <Card className={cn("gap-0 border-border/60 py-0", className)}>
      <CardHeader className="flex-row items-center justify-between gap-2 border-b border-border/60 py-3.5">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className={cn("py-3.5", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
