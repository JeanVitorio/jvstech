import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  Bot,
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/components/ThemeProvider";
import { useApp } from "@/store/AppStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useBilling } from "@/context/BillingContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };

const nav: NavItem[] = [
  { to: "/", label: "Dashboard de Vendas", icon: LayoutDashboard, end: true },
  { to: "/dashboard-bots", label: "Dashboard dos Bots", icon: Bot },
  { to: "/sales", label: "Funil de Vendas", icon: Target },
  { to: "/bots", label: "Bots", icon: Bot },
  { to: "/message-bots", label: "Bots de WhatsApp", icon: MessageCircle },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/billing", label: "Plano e consumo", icon: CreditCard },
  { to: "/installation", label: "Instalação", icon: Download },
];

export function AppLayout() {
  const { theme, toggle } = useTheme();
  const { currentUser, usingBackend } = useApp();
  const { user, logout } = useAuth();
  const { status: billing } = useBilling();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleNav = user?.is_leader
    ? [
        ...nav.slice(0, -1),
        { to: "/collaborators", label: "Colaboradores", icon: UserRoundCog },
        nav[nav.length - 1],
      ]
    : nav;

  const SidebarContent = (
    <>
      <div className="mb-8 flex items-center gap-3 px-2">
        <Logo size={40} className="rounded-xl" />
        <div>
          <h1 className="font-display text-lg font-bold leading-none tracking-[-0.035em]">
            JVS LeadFlow
          </h1>
          <p className="mt-1 text-[0.68rem] text-muted-foreground">Prospecção inteligente</p>
        </div>
      </div>

      <nav className="space-y-1 flex-1">
        {visibleNav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
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

      <div className="mt-auto space-y-3 border-t border-sidebar-border/70 pt-4">
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
              {billing.leads_remaining.toLocaleString("pt-BR")} leads restantes
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full gradient-primary"
                style={{
                  width: `${Math.max(
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
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_4%,hsl(var(--primary)/.08),transparent_24rem),radial-gradient(circle_at_94%_92%,hsl(var(--accent)/.05),transparent_28rem)]" />
      <aside className="sticky top-3 z-10 m-3 mr-0 hidden h-[calc(100vh-1.5rem)] w-72 shrink-0 flex-col rounded-3xl border border-sidebar-border/70 bg-sidebar/80 px-4 py-6 shadow-elegant backdrop-blur-2xl lg:flex">
        {SidebarContent}
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="flex w-72 flex-col border-r-sidebar-border bg-sidebar/95 p-4 backdrop-blur-2xl"
        >
          {SidebarContent}
        </SheetContent>
      </Sheet>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-3 z-20 mx-3 mt-3 flex h-16 items-center justify-between gap-2 rounded-2xl border border-border/70 bg-background/72 px-3 shadow-sm backdrop-blur-2xl sm:gap-4 sm:px-5">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 sm:gap-3">
            <Badge
              variant="outline"
              className="hidden md:inline-flex gap-1 border-accent/40 text-accent"
            >
              <Bot className="w-3 h-3" />{" "}
              {currentUser.role === "leader"
                ? "Administrador"
                : currentUser.role === "commercial"
                  ? "Comercial"
                  : currentUser.is_manager
                    ? "Gerente"
                    : "Usuário"}
            </Badge>
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
        <main key={location.pathname} className="flex-1 animate-fade-in p-2 pt-5 sm:p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
