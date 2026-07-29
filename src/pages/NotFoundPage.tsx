import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <p className="text-5xl font-bold text-foreground">404</p>
      <p className="text-muted-foreground">Essa página não existe.</p>
      <Button asChild>
        <Link to="/play">Voltar pro jogo</Link>
      </Button>
    </div>
  );
}
