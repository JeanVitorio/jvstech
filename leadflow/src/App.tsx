import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppStoreProvider } from "@/store/AppStore";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { BillingProvider } from "@/context/BillingContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { SearchProvider } from "@/context/SearchContext";
import Dashboard from "./pages/Dashboard";
import SalesDashboard from "./pages/SalesDashboard";
import Bots from "./pages/Bots";
import MessageBots from "./pages/MessageBots";
import Login from "./pages/LoginPremium";
import Profile from "./pages/Profile";
import SalesFunnel from "./pages/SalesFunnel";
import Leads from "./pages/Leads";
import Installation from "./pages/Installation";
import Billing from "./pages/Billing";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Signup from "./pages/SignupPremium";
import Collaborators from "./pages/Collaborators";
import WhatsAppSettings from "./pages/WhatsAppSettings";
import NotFound from "./pages/NotFound.tsx";
import type { ReactNode } from "react";
import { useMessageBotPermission } from "@/hooks/useWhatsAppMeta";

const queryClient = new QueryClient();

function Protected({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function TenantManagerOnly({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!["owner", "admin"].includes(user.tenant_role ?? "")) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function MessageBotsOnly({ children }: { children: ReactNode }) {
  const permission = useMessageBotPermission();
  if (permission.isLoading) return null;
  if (permission.data !== true) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <NotificationsProvider>
        <AuthProvider>
          <BillingProvider>
            <AppStoreProvider>
              <SearchProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter basename="/LeadFlow">
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route
                        element={
                          <Protected>
                            <AppLayout />
                          </Protected>
                        }
                      >
                        <Route path="/" element={<SalesDashboard />} />
                        <Route path="/dashboard-bots" element={<Dashboard />} />
                        <Route path="/bots" element={<Bots />} />
                        <Route
                          path="/message-bots"
                          element={
                            <MessageBotsOnly>
                              <MessageBots />
                            </MessageBotsOnly>
                          }
                        />
                        <Route
                          path="/whatsapp-settings"
                          element={
                            <TenantManagerOnly>
                              <MessageBotsOnly>
                                <WhatsAppSettings />
                              </MessageBotsOnly>
                            </TenantManagerOnly>
                          }
                        />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/sales" element={<SalesFunnel />} />
                        <Route path="/leads" element={<Leads />} />
                        <Route
                          path="/collaborators"
                          element={
                            <TenantManagerOnly>
                              <Collaborators />
                            </TenantManagerOnly>
                          }
                        />
                        <Route path="/installation" element={<Installation />} />
                        <Route path="/billing" element={<Billing />} />
                      </Route>
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                </TooltipProvider>
              </SearchProvider>
            </AppStoreProvider>
          </BillingProvider>
        </AuthProvider>
      </NotificationsProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
