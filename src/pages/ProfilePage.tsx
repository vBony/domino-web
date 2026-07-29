import { User } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageContainer } from "@/components/PageContainer";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useAuth } from "@/hooks/useAuth";

export function ProfilePage() {
  const { user } = useAuth();

  return (
    <PageContainer title="Perfil">
      <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-5">
        <PlayerAvatar name={user?.nickname ?? "?"} size="lg" />
        <div>
          <p className="text-lg font-semibold text-foreground">{user?.nickname}</p>
          <p className="text-sm text-muted-foreground">Jogador de Dominó Online</p>
        </div>
      </div>

      <EmptyState
        icon={User}
        title="Mais recursos de perfil em breve"
        description="Histórico de partidas, conquistas e estatísticas detalhadas vão aparecer aqui."
      />
    </PageContainer>
  );
}
