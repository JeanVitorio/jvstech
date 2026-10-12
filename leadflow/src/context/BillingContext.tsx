import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type {
  BillingStatus,
  PlanCode,
  SubscriptionPlan,
} from "@/types/billing";

// Os tipos são regenerados após a aplicação das migrations SaaS.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface BillingState {
  status: BillingStatus | null;
  plans: SubscriptionPlan[];
  loading: boolean;
  refresh: () => Promise<void>;
  checkout: (plan: Exclude<PlanCode, "free">) => Promise<void>;
  openPortal: () => Promise<void>;
}

const BillingCtx = createContext<BillingState | null>(null);

export function BillingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setStatus(null);
      setPlans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [statusResult, plansResult] = await Promise.all([
      db.rpc("prospecta_get_billing_status"),
      db
        .from("subscription_plans")
        .select("code, name, monthly_price_cents, leads_per_month")
        .eq("active", true)
        .order("monthly_price_cents"),
    ]);
    if (statusResult.error) throw statusResult.error;
    if (plansResult.error) throw plansResult.error;
    setStatus(statusResult.data as BillingStatus | null);
    setPlans((plansResult.data ?? []) as SubscriptionPlan[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh().catch((error) => {
      console.error("[BillingContext]", error);
      setLoading(false);
    });
  }, [refresh]);

  const checkout = useCallback(async (plan: Exclude<PlanCode, "free">) => {
    const { data, error } = await supabase.functions.invoke(
      "create-checkout-session",
      { body: { plan_code: plan } },
    );
    if (error) throw error;
    if (!data?.url) throw new Error(data?.error ?? "Checkout indisponível");
    window.location.assign(data.url);
  }, []);

  const openPortal = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke(
      "create-portal-session",
    );
    if (error) throw error;
    if (!data?.url) throw new Error(data?.error ?? "Portal indisponível");
    window.location.assign(data.url);
  }, []);

  return (
    <BillingCtx.Provider value={{
      status,
      plans,
      loading,
      refresh,
      checkout,
      openPortal,
    }}>
      {children}
    </BillingCtx.Provider>
  );
}

export function useBilling() {
  const context = useContext(BillingCtx);
  if (!context) {
    throw new Error("useBilling deve ser usado dentro de BillingProvider");
  }
  return context;
}
