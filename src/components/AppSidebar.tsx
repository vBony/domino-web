import { BarChart3, Gamepad2, LogOut, Settings, User, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/play", label: "Jogar", icon: Gamepad2 },
  { to: "/lobby", label: "Lobby", icon: Users },
  { to: "/profile", label: "Perfil", icon: User },
  { to: "/stats", label: "Estatísticas", icon: BarChart3 },
  { to: "/settings", label: "Configurações", icon: Settings }
] as const;

// Sidebar simples em CSS puro (sem estado de collapse com cookie/atalho de
// teclado - nao pedido agora): so icones no breakpoint md (tablet), icone +
// label a partir de lg (desktop). Estruturada pra um toggle funcional poder
// ser adicionado depois sem reescrever o componente.
export function AppSidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex md:w-[72px] lg:w-64">
      <div className="flex h-16 items-center justify-center border-b border-sidebar-border px-2 lg:justify-start lg:px-5">
        <Logo textClassName="hidden lg:block" />
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 py-4 lg:px-3">
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
        ))}
      </nav>

      <div className="flex flex-col gap-2 border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 overflow-hidden px-1 lg:px-0">
          <PlayerAvatar name={user?.nickname ?? "?"} size="sm" />
          <span className="hidden truncate text-sm font-medium text-sidebar-foreground lg:inline">
            {user?.nickname}
          </span>
        </div>
        <SidebarActionButton label="Sair" icon={LogOut} onClick={logout} />
      </div>
    </aside>
  );
}

interface SidebarLinkProps {
  to: string;
  label: string;
  icon: typeof Gamepad2;
}

function SidebarLink({ to, label, icon: Icon }: SidebarLinkProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavLink
          to={to}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
              isActive && "bg-sidebar-accent text-sidebar-foreground"
            )
          }
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <span className="hidden lg:inline">{label}</span>
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right" className="lg:hidden">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarActionButton({
  label,
  icon: Icon,
  onClick
}: {
  label: string;
  icon: typeof LogOut;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <span className="hidden lg:inline">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="lg:hidden">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
