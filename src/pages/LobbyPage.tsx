import { Users } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageContainer } from "@/components/PageContainer";

export function LobbyPage() {
  return (
    <PageContainer title="Lobby" description="Encontre mesas abertas e outros jogadores.">
      <EmptyState
        icon={Users}
        title="Lobby em construção"
        description="Em breve você vai poder ver mesas abertas, convidar amigos e escolher partidas por aqui."
      />
    </PageContainer>
  );
}
