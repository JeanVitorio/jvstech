import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from "@/integrations/supabase/client";
import type { Session, User as SupaUser } from "@supabase/supabase-js";
import type { PlanCode } from "@/types/billing";

// O schema SaaS será incluído nos tipos gerados após a migration remota.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type AppRole = "leader" | "manager" | "collaborator" | "commercial";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  position?: string | null;
  role: AppRole;
  is_manager: boolean;
  is_leader: boolean;
  is_commercial: boolean;
  tenant_id: string | null;
  tenant_role: "owner" | "admin" | "member" | null;
}

interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginWithGoogle: (
    companyName?: string,
    planCode?: PlanCode,
  ) => Promise<{ ok: boolean; error?: string }>;
  signup: (
    name: string,
    companyName: string,
    email: string,
    password: string,
    planCode?: PlanCode,
  ) => Promise<{ ok: boolean; error?: string; confirmation?: boolean }>;
  requestPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);
const OAUTH_COMPANY_KEY = "leadflow_oauth_company_name";

function planDestination(planCode: PlanCode): string {
  return planCode === "free"
    ? "/LeadFlow/"
    : `/LeadFlow/billing?plan=${encodeURIComponent(planCode)}&onboarding=1`;
}

async function completeOAuthOnboarding(supaUser: SupaUser): Promise<void> {
  if (supaUser.app_metadata.provider !== "google") return;
  const companyName = localStorage.getItem(OAUTH_COMPANY_KEY)?.trim();
  if (!companyName) return;
  const { error } = await db.rpc("prospecta_complete_oauth_onboarding", {
    p_company_name: companyName,
  });
  if (error) throw error;
  localStorage.removeItem(OAUTH_COMPANY_KEY);
}

async function loadAppUser(supaUser: SupaUser): Promise<AuthUser> {
  const [{ data: profile }, { data: roles, error: rolesError }, tenantResult] = await Promise.all([
    db
      .from("profiles")
      .select("name, avatar_url, position, active_tenant_id")
      .eq("id", supaUser.id)
      .maybeSingle(),
    db.from("user_roles").select("role").eq("user_id", supaUser.id),
    db.rpc("current_tenant_id"),
  ]);
  if (rolesError) console.error("[AuthContext] user_roles query error:", rolesError);
  const roleList = (roles ?? []).map((roleRow) => roleRow.role as AppRole);
  const role: AppRole = roleList.includes("leader")
    ? "leader"
    : roleList.includes("manager")
      ? "manager"
      : roleList.includes("commercial")
        ? "commercial"
        : "collaborator";
  const tenantId = (tenantResult.data as string | null) ?? null;
  const { data: membership } = tenantId
    ? await db
        .from("tenant_memberships")
        .select("role")
        .eq("tenant_id", tenantId)
        .eq("user_id", supaUser.id)
        .maybeSingle()
    : { data: null };
  return {
    id: supaUser.id,
    email: supaUser.email ?? "",
    name: profile?.name ?? supaUser.email?.split("@")[0] ?? "Usuário",
    avatar_url: profile?.avatar_url,
    position: profile?.position,
    role,
    is_leader: role === "leader",
    is_manager: role === "manager" || role === "leader",
    is_commercial: role === "commercial",
    tenant_id: tenantId ?? profile?.active_tenant_id ?? null,
    tenant_role: (membership?.role as AuthUser["tenant_role"] | undefined) ?? null,
  };
}

async function syncNativeSession(session: Session | null) {
  const configure = window.pywebview?.api?.configurar_sessao;
  if (!session || !configure) return;
  await configure({
    supabase_url: SUPABASE_URL,
    publishable_key: SUPABASE_PUBLISHABLE_KEY,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      syncNativeSession(s).catch((error) =>
        console.error("[AuthContext] native session sync:", error),
      );
      if (s?.user) {
        // defer profile loading to avoid deadlock with the auth callback
        setTimeout(() => {
          completeOAuthOnboarding(s.user)
            .catch((error) => console.error("[AuthContext] OAuth onboarding:", error))
            .finally(() => loadAppUser(s.user).then(setUser));
        }, 0);
      } else {
        setUser(null);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await syncNativeSession(data.session);
      if (data.session?.user) {
        await completeOAuthOnboarding(data.session.user).catch((error) =>
          console.error("[AuthContext] OAuth onboarding:", error),
        );
        setUser(await loadAppUser(data.session.user));
      }
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const sync = () => {
      void syncNativeSession(session);
    };
    window.addEventListener("pywebviewready", sync);
    return () => window.removeEventListener("pywebviewready", sync);
  }, [session]);

  async function login(email: string, password: string) {
    localStorage.removeItem(OAUTH_COMPANY_KEY);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  async function loginWithGoogle(companyName?: string, planCode: PlanCode = "free") {
    const normalizedCompany = companyName?.trim();
    if (normalizedCompany) {
      localStorage.setItem(OAUTH_COMPANY_KEY, normalizedCompany);
    } else {
      localStorage.removeItem(OAUTH_COMPANY_KEY);
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${planDestination(planCode)}`,
      },
    });
    if (error) {
      localStorage.removeItem(OAUTH_COMPANY_KEY);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  async function signup(
    name: string,
    companyName: string,
    email: string,
    password: string,
    planCode: PlanCode = "free",
  ) {
    localStorage.removeItem(OAUTH_COMPANY_KEY);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name: name.trim(),
          company_name: companyName.trim(),
        },
        emailRedirectTo: `${window.location.origin}${planDestination(planCode)}`,
      },
    });
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      confirmation: !data.session,
    };
  }

  async function requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/LeadFlow/reset-password`,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  async function refresh() {
    const { data } = await supabase.auth.getUser();
    if (data.user) setUser(await loadAppUser(data.user));
  }

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        ready,
        login,
        loginWithGoogle,
        signup,
        requestPasswordReset,
        updatePassword,
        logout,
        refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
