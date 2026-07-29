import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageContainer } from "@/components/PageContainer";

export function StatsPage() {
  return (
    <PageContainer title="Estatísticas" description="Acompanhe sua evolução como jogador.">
      <EmptyState
        icon={BarChart3}
        title="Estatísticas em construção"
        description="Vitórias, derrotas, sequências e ranking vão aparecer aqui assim que o histórico de partidas existir."
      />
    </PageContainer>
  );
}
