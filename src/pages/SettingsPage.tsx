import { Settings } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageContainer } from "@/components/PageContainer";

export function SettingsPage() {
  return (
    <PageContainer title="Configurações" description="Preferências da sua conta e da plataforma.">
      <EmptyState
        icon={Settings}
        title="Configurações em construção"
        description="Preferências de conta, notificações e aparência vão aparecer aqui."
      />
    </PageContainer>
  );
}
