import { useEffect, useMemo, useState } from "react";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import { useBilling } from "@/context/BillingContext";
import type { PlanCode } from "@/types/billing";

export default function Billing() {
  const { user } = useAuth();
  const { status, plans, loading, checkout, openPortal, refresh } =
    useBilling();
  const [searchParams] = useSearchParams();
  const [busyPlan, setBusyPlan] = useState<PlanCode | "portal" | null>(
    null,
  );
  const canManage =
    user?.tenant_role === "owner" || user?.tenant_role === "admin";
  const usagePercent = useMemo(() => {
    if (!status?.leads_limit) return 0;
    return Math.min(
      100,
      Math.round((status.leads_used / status.leads_limit) * 100),
    );
  }, [status]);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      toast.success("Pagamento recebido. A assinatura será atualizada.");
      void refresh();
    }
  }, [refresh, searchParams]);

  async function choosePlan(code: PlanCode) {
    if (code === "free" || !canManage) return;
    setBusyPlan(code);
    try {
      if (status?.plan_code !== "free") {
        await openPortal();
      } else {
        await checkout(code);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir o pagamento.",
      );
      setBusyPlan(null);
    }
  }

  async function manageSubscription() {
    setBusyPlan("portal");
    try {
      await openPortal();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir o portal.",
      );
      setBusyPlan(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <PageHeader
        title="Plano e consumo"
        subtitle="Acompanhe seus leads mensais e gerencie sua assinatura."
      />

      <Card className="p-5 mb-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Carregando assinatura...
          </p>
        ) : status ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Plano atual</p>
                <div className="flex items-center gap-2 mt-1">
                  <h2 className="font-display text-xl font-bold">
                    {status.plan_name}
                  </h2>
                  <Badge variant="outline">{status.status}</Badge>
                </div>
              </div>
              {canManage && status.plan_code !== "free" && (
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={busyPlan === "portal"}
                  onClick={manageSubscription}
                >
                  <CreditCard className="w-4 h-4" />
                  Gerenciar cobrança
                </Button>
              )}
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>{status.leads_used.toLocaleString("pt-BR")} usados</span>
                <span>
                  {status.leads_limit.toLocaleString("pt-BR")} por mês
                </span>
              </div>
              <Progress value={usagePercent} />
              <p className="text-xs text-muted-foreground mt-2">
                Restam {status.leads_remaining.toLocaleString("pt-BR")} leads
                neste período.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-destructive">
            Assinatura não encontrada para esta empresa.
          </p>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const current = plan.code === status?.plan_code;
          return (
            <Card
              key={plan.code}
              className={`p-5 flex flex-col ${
                current ? "border-primary shadow-glow" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display font-bold text-lg">
                  {plan.name}
                </h3>
                {current && <Badge>Atual</Badge>}
              </div>
              <p className="text-2xl font-bold mt-4">
                {plan.monthly_price_cents === 0
                  ? "Grátis"
                  : (plan.monthly_price_cents / 100).toLocaleString(
                      "pt-BR",
                      { style: "currency", currency: "BRL" },
                    )}
              </p>
              <p className="text-xs text-muted-foreground">por mês</p>
              <div className="flex items-start gap-2 text-sm mt-5 flex-1">
                <Check className="w-4 h-4 text-success mt-0.5" />
                Até {plan.leads_per_month.toLocaleString("pt-BR")} leads
                gerados por mês
              </div>
              <Button
                className="mt-5 gap-2"
                variant={current ? "outline" : "default"}
                disabled={
                  current ||
                  plan.code === "free" ||
                  !canManage ||
                  busyPlan !== null
                }
                onClick={() => choosePlan(plan.code)}
              >
                <Sparkles className="w-4 h-4" />
                {current ? "Plano atual" : "Escolher plano"}
              </Button>
            </Card>
          );
        })}
      </div>
      {!canManage && (
        <p className="text-sm text-muted-foreground mt-5">
          Apenas o proprietário ou administrador da empresa pode alterar o
          plano.
        </p>
      )}
    </div>
  );
}
