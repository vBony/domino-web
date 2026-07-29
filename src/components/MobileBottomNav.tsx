import { BarChart3, Gamepad2, LogOut, MoreHorizontal, Settings, User, Users } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/play", label: "Jogo", icon: Gamepad2 },
  { to: "/lobby", label: "Lobby", icon: Users },
  { to: "/profile", label: "Perfil", icon: User }
] as const;

// Bottom nav so aparece em mobile (`md:hidden`) - AppSidebar cobre
// tablet/desktop. "Mais" concentra Estatisticas/Configuracoes/Sair, ja que
// so cabem 4 itens na barra.
export function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-center justify-around border-t border-border/60 bg-background/95 backdrop-blur-sm md:hidden">
      {NAV_ITEMS.map((item) => (
        <BottomNavLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
      ))}
      <MoreMenu />
    </nav>
  );
}

interface BottomNavLinkProps {
  to: string;
  label: string;
  icon: typeof Gamepad2;
}

function BottomNavLink({ to, label, icon: Icon }: BottomNavLinkProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors",
          isActive && "text-primary"
        )
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  );
}

function MoreMenu() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground outline-none">
        <MoreHorizontal className="h-5 w-5" />
        Mais
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="mb-2">
        <DropdownMenuItem onSelect={() => navigate("/stats")}>
          <BarChart3 className="h-4 w-4" />
          Estatísticas
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/settings")}>
          <Settings className="h-4 w-4" />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={logout}>
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
