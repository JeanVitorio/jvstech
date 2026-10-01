import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { Bot, Database, Download, LayoutDashboard, LogOut, Menu, MessageCircle, Moon, Sun, Target, UserCircle2, UserRoundCog, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/components/ThemeProvider";
import { useApp } from "@/store/AppStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };

const nav: NavItem[] = [
  { to: "/", label: "Dashboard de Vendas", icon: LayoutDashboard, end: true },
  { to: "/dashboard-bots", label: "Dashboard dos Bots", icon: Bot },
  { to: "/sales", label: "Funil de Vendas", icon: Target },
  { to: "/bots", label: "Bots", icon: Bot },
  { to: "/message-bots", label: "Bots de WhatsApp", icon: MessageCircle },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/installation", label: "Instalação", icon: Download },
];

export function AppLayout() {
  const { theme, toggle } = useTheme();
  const { currentUser, usingBackend } = useApp();
  const { user, logout } = useAuth();
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
        <div className="flex items-center gap-3 px-2 mb-8">
          <Logo size={36} />
          <div>
            <h1 className="font-display font-bold text-lg leading-none">Prospecta Flow</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Robot</p>
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
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
            <Database className="w-3 h-3" />
            {usingBackend ? <span className="text-success">Conectado ao banco</span> : <span>Modo demo (mock)</span>}
          </div>
          <p className="text-[10px] text-muted-foreground/60 px-2 mt-2">por JVS Tech</p>
        </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="hidden lg:flex w-64 border-r border-sidebar-border bg-sidebar shrink-0 flex-col py-6 px-4">
        {SidebarContent}
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-4 flex flex-col">
          {SidebarContent}
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 sm:gap-3">
            <Badge variant="outline" className="hidden md:inline-flex gap-1 border-accent/40 text-accent">
              <Bot className="w-3 h-3" /> {currentUser.role === "leader" ? "Administrador" : currentUser.role === "commercial" ? "Comercial" : currentUser.is_manager ? "Gerente" : "Usuário"}
            </Badge>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shadow-glow hover:scale-105 transition overflow-hidden">
                  {currentUser.avatar_url
                    ? <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full object-cover" />
                    : currentUser.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{currentUser.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">{currentUser.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="gap-2 cursor-pointer flex items-center">
                    <UserCircle2 className="w-4 h-4" /> Meu perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="gap-2 text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main key={location.pathname} className="flex-1 p-0 sm:p-2 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
