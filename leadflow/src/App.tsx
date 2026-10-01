import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppStoreProvider } from "@/store/AppStore";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { SearchProvider } from "@/context/SearchContext";
import Dashboard from "./pages/Dashboard";
import SalesDashboard from "./pages/SalesDashboard";
import Bots from "./pages/Bots";
import MessageBots from "./pages/MessageBots";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import SalesFunnel from "./pages/SalesFunnel";
import Leads from "./pages/Leads";
import Installation from "./pages/Installation";
import Collaborators from "./pages/Collaborators";
import NotFound from "./pages/NotFound.tsx";
import type { ReactNode } from "react";

const queryClient = new QueryClient();

function Protected({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function LeaderOnly({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_leader) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <NotificationsProvider>
        <AuthProvider>
          <AppStoreProvider>
            <SearchProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route element={<Protected><AppLayout /></Protected>}>
                      <Route path="/" element={<SalesDashboard />} />
                      <Route path="/dashboard-bots" element={<Dashboard />} />
                      <Route path="/bots" element={<Bots />} />
                      <Route path="/message-bots" element={<MessageBots />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/sales" element={<SalesFunnel />} />
                      <Route path="/leads" element={<Leads />} />
                      <Route
                        path="/collaborators"
                        element={<LeaderOnly><Collaborators /></LeaderOnly>}
                      />
                      <Route path="/installation" element={<Installation />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </SearchProvider>
          </AppStoreProvider>
        </AuthProvider>
      </NotificationsProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
