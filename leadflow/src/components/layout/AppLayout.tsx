import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  CircleHelp,
  CreditCard,
  Database,
  Download,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Sun,
  Target,
  UserCircle2,
  UserRoundCog,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import "@/components/bots/office/office.css";
import { Logo } from "@/components/Logo";
import { RefreshButton } from "@/components/layout/RefreshButton";
import { useTheme } from "@/components/ThemeProvider";
import { useApp } from "@/store/AppStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useBilling } from "@/context/BillingContext";
import { useMessageBotPermission } from "@/hooks/useMessageBots";
import { useAppInstallation } from "@/hooks/useBots";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// "tour" identifica o item destacado pelo tour do primeiro acesso.
type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; tour?: string };

const nav: NavItem[] = [
  { to: "/", label: "Dashboard de Vendas", icon: LayoutDashboard, end: true },
  { to: "/sales", label: "Funil de Vendas", icon: Target },
  { to: "/agentes", label: "Agentes de Prospecção", icon: Bot, tour: "agentes" },
  { to: "/agentes-whatsapp", label: "Agentes de WhatsApp", icon: MessageCircle },
  { to: "/leads", label: "Leads", icon: Users, tour: "leads" },
  { to: "/installation", label: "Instalação", icon: Download, tour: "installation" },
  { to: "/billing", label: "Plano e consumo", icon: CreditCard },
  { to: "/duvidas", label: "Dúvidas", icon: CircleHelp, tour: "duvidas" },
];

const collaboratorsItem: NavItem = {
  to: "/collaborators",
  label: "Colaboradores",
  icon: UserRoundCog,
};

export function AppLayout() {
  const { theme, toggle } = useTheme();
  const { currentUser, usingBackend } = useApp();
  const { user, logout } = useAuth();
  const { status: billing } = useBilling();
  const messageBotPermission = useMessageBotPermission();
  const installation = useAppInstallation();
  const location = useLocation();
  // O menu fica recolhido por padrão em qualquer tamanho de tela e só abre pelo hambúrguer.
  const [menuAberto, setMenuAberto] = useState(false);

  // O tour do primeiro acesso destaca itens do menu, então pede para abri-lo.
  useEffect(() => {
    const aoPedirMenu = (evento: Event) => {
      setMenuAberto(Boolean((evento as CustomEvent<boolean>).detail));
    };
    window.addEventListener("jvs-tour-menu", aoPedirMenu);
    return () => window.removeEventListener("jvs-tour-menu", aoPedirMenu);
  }, []);
  const canManageTenant = user?.tenant_role === "owner" || user?.tenant_role === "admin";
  const canUseMessageBots = messageBotPermission.data === true;
  const authorizedNav = nav.filter(
    (item) => item.to !== "/agentes-whatsapp" || canUseMessageBots,
  );
  const installationIndex = authorizedNav.findIndex((item) => item.to === "/installation");
  const visibleNav = canManageTenant
    ? [
        ...authorizedNav.slice(0, installationIndex),
        collaboratorsItem,
        ...authorizedNav.slice(installationIndex),
      ]
    : authorizedNav;
  const appStatus = installation.data;
  const showInstallBanner =
    appStatus?.installed === false && location.pathname !== "/installation";

  const SidebarContent = (
    <>
      <div className="relative z-10 mb-8 flex items-center gap-3 px-2">
        <Logo size={40} className="rounded-xl" />
        <div>
          <h1 className="font-display text-lg font-bold leading-none tracking-[-0.035em]">
            JVS LeadFlow
          </h1>
          <p className="mt-1 text-[0.68rem] text-muted-foreground">Prospecção inteligente</p>
        </div>
      </div>

      <nav className="relative z-10 flex-1 space-y-1">
        {visibleNav.map(({ to, label, icon: Icon, end, tour }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            data-tour={tour}
            onClick={() => setMenuAberto(false)}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm before:absolute before:-left-1 before:h-5 before:w-1 before:rounded-full before:bg-primary"
                  : "text-sidebar-foreground hover:translate-x-0.5 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="relative z-10 mt-auto space-y-3 border-t border-sidebar-border/70 pt-4">
        {billing && (
          <Link
            to="/billing"
            className="block rounded-2xl border border-primary/20 bg-primary/[0.06] p-3 transition-all hover:border-primary/35 hover:bg-primary/[0.1]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {billing.plan_name}
              </span>
              <CreditCard className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="mt-2 text-sm font-semibold">
              {billing.is_unlimited
                ? "Leads ilimitados"
                : `${billing.leads_remaining.toLocaleString("pt-BR")} leads restantes`}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full gradient-primary"
                style={{
                  width: billing.is_unlimited
                    ? "100%"
                    : `${Math.max(
                        3,
                        Math.min(
                          100,
                          billing.leads_limit > 0
                            ? (billing.leads_used / billing.leads_limit) * 100
                            : 0,
                        ),
                      )}%`,
                }}
              />
            </div>
          </Link>
        )}
        {appStatus && (
          <Link
            to="/installation"
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-sidebar-accent/60"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                appStatus.online
                  ? "bg-success shadow-[0_0_0_3px_hsl(var(--success)/0.18)]"
                  : appStatus.installed
                    ? "bg-warning"
                    : "bg-muted-foreground/50"
              }`}
            />
            {appStatus.online
              ? "App conectado"
              : appStatus.installed
                ? "App instalado, fora do ar"
                : "App não instalado"}
          </Link>
        )}
        <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
          <Database className="w-3 h-3" />
          {usingBackend ? (
            <span className="text-success">Conectado ao banco</span>
          ) : (
            <span>Modo demo (mock)</span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground/60 px-2 mt-2">por JVS Tech</p>
      </div>
    </>
  );

  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      {/* ambiente de sala por trás de todas as telas */}
      <div className="jvs-room" aria-hidden="true" />

      <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
        <SheetContent
          side="left"
          className="jvs-panel jvs-panel--spot flex w-72 flex-col border-r border-sidebar-border/70 p-4"
        >
          {SidebarContent}
        </SheetContent>
      </Sheet>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="jvs-panel sticky top-3 z-20 mx-3 mt-3 flex h-16 items-center justify-between gap-2 rounded-2xl border border-border/70 px-3 shadow-sm sm:gap-4 sm:px-5">
          <Button
            variant="ghost"
            size="icon"
            className="relative z-10"
            aria-label="Abrir menu"
            onClick={() => setMenuAberto(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1" />
          <div className="relative z-10 flex items-center gap-2 sm:gap-3">
            <Badge
              variant="outline"
              className="hidden md:inline-flex gap-1 border-accent/40 text-accent"
            >
              <Bot className="w-3 h-3" />{" "}
              {user?.tenant_role === "owner"
                ? "Proprietário"
                : user?.tenant_role === "admin"
                  ? "Administrador"
                  : currentUser.role === "commercial"
                    ? "Comercial"
                    : "Usuário"}
            </Badge>
            <RefreshButton />
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="gradient-primary flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-primary-foreground shadow-glow ring-2 ring-background transition hover:scale-105">
                  {currentUser.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    currentUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{currentUser.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {currentUser.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="gap-2 cursor-pointer flex items-center">
                    <UserCircle2 className="w-4 h-4" /> Meu perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {billing && !["active", "trialing"].includes(billing.status) && (
          <Link
            to="/billing"
            className="bg-warning/15 border-b border-warning/30 px-4 py-2 text-sm text-warning-foreground text-center"
          >
            Sua assinatura requer atenção. Atualize a forma de pagamento para voltar a gerar leads.
          </Link>
        )}
        {showInstallBanner && (
          <Link
            to="/installation"
            className="group mx-3 mt-3 flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/[0.07] px-4 py-3 text-sm backdrop-blur-xl transition hover:border-primary/40 hover:bg-primary/[0.11]"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl gradient-primary text-primary-foreground">
              <Download className="h-4 w-4" />
            </span>
            <span className="flex-1">
              <strong className="font-semibold">Instale o app no seu PC</strong>
              <span className="hidden text-muted-foreground sm:inline">
                {" "}
                para seus agentes começarem a gerar leads.
              </span>
            </span>
            <span className="flex items-center gap-1 font-semibold text-primary">
              Instalar
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        )}
        <main key={location.pathname} className="flex-1 animate-fade-in p-2 pt-5 sm:p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
      <OnboardingTour />
    </div>
  );
}
