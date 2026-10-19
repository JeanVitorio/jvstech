import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CreditCard,
  Crown,
  Gauge,
  Rocket,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Zap,
} from "lucide-react";
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

const planPresentation = {
  free: {
    tagline: "Para experimentar",
    description: "Conheça o fluxo completo e gere seus primeiros contatos sem compromisso.",
    icon: Sparkles,
    features: ["Gestão de leads", "Funil de vendas", "Acesso pelo celular e computador"],
  },
  basic: {
    tagline: "Para começar a crescer",
    description: "Volume essencial para construir uma rotina comercial consistente.",
    icon: Zap,
    features: ["Prospecção automatizada", "Gestão de responsáveis", "Funil integrado"],
  },
  plus: {
    tagline: "Para acelerar de verdade",
    description: "Mais oportunidades para equipes que querem ampliar o ritmo de vendas.",
    icon: Rocket,
    features: ["Bots de prospecção", "Funil de vendas", "Gestão de equipe"],
  },
  pro: {
    tagline: "Para máxima escala",
    description: "Toda a potência do LeadFlow para operações comerciais de alto volume.",
    icon: Crown,
    features: ["3.000 leads mensais", "Todos os recursos", "Operação centralizada"],
  },
} satisfies Record<
  PlanCode,
  {
    tagline: string;
    description: string;
    icon: typeof Sparkles;
    features: string[];
  }
>;

export default function Billing() {
  const { user } = useAuth();
  const { status, plans, loading, checkout, openPortal, refresh } = useBilling();
  const [searchParams] = useSearchParams();
  const [busyPlan, setBusyPlan] = useState<PlanCode | "portal" | null>(null);
  const onboardingStarted = useRef(false);
  const canManage = user?.tenant_role === "owner" || user?.tenant_role === "admin";
  const usagePercent = useMemo(() => {
    if (!status?.leads_limit) return 0;
    return Math.min(100, Math.round((status.leads_used / status.leads_limit) * 100));
  }, [status]);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      toast.success("Pagamento recebido. A assinatura será atualizada.");
      void refresh();
    }
  }, [refresh, searchParams]);

  useEffect(() => {
    const requestedPlan = searchParams.get("plan");
    if (
      loading ||
      !canManage ||
      !status?.plan_code ||
      onboardingStarted.current ||
      !["basic", "plus", "pro"].includes(requestedPlan ?? "")
    ) {
      return;
    }
    onboardingStarted.current = true;
    const plan = requestedPlan as Exclude<PlanCode, "free">;
    setBusyPlan(plan);
    const action = status?.plan_code === "free" ? checkout(plan) : openPortal();
    action.catch((error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir o pagamento.");
      setBusyPlan(null);
    });
  }, [canManage, checkout, loading, openPortal, searchParams, status?.plan_code]);

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
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir o pagamento.");
      setBusyPlan(null);
    }
  }

  async function manageSubscription() {
    setBusyPlan("portal");
    try {
      await openPortal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir o portal.");
      setBusyPlan(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <PageHeader
        title="Escolha o ritmo do seu crescimento"
        subtitle="Aumente sua capacidade de prospecção quando sua operação pedir mais oportunidades."
      />

      <Card className="relative mb-8 overflow-hidden border-primary/25 bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--primary)/0.09)_100%)] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-[90px]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando assinatura...</p>
        ) : status ? (
          <div className="relative grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/12">
                  <Gauge className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                    Sua assinatura
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-2xl font-bold">{status.plan_name}</h2>
                    <Badge variant="outline" className="bg-background/35">
                      {status.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
                Você ainda tem{" "}
                <strong className="font-semibold text-foreground">
                  {status.leads_remaining.toLocaleString("pt-BR")} leads
                </strong>{" "}
                disponíveis neste ciclo.
              </p>
              {canManage && status.plan_code !== "free" && (
                <Button
                  variant="outline"
                  className="mt-5 gap-2 bg-background/30"
                  disabled={busyPlan === "portal"}
                  onClick={manageSubscription}
                >
                  <CreditCard className="w-4 h-4" />
                  Gerenciar cobrança
                </Button>
              )}
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/35 p-5 shadow-inner backdrop-blur-xl sm:p-6">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Consumo mensal</p>
                  <p className="mt-1 font-display text-3xl font-bold tracking-tight">
                    {usagePercent}%
                  </p>
                </div>
                <p className="text-right text-xs text-muted-foreground">
                  {status.leads_used.toLocaleString("pt-BR")} de{" "}
                  {status.leads_limit.toLocaleString("pt-BR")} por mês
                </p>
              </div>
              <Progress value={usagePercent} className="h-3 bg-muted/70" />
              <div className="mt-4 flex items-center justify-between text-[0.68rem] text-muted-foreground">
                <span>Início do ciclo</span>
                <span>Renovação mensal</span>
              </div>
              {typeof status.user_limit === "number" && (
                <div className="mt-5 flex items-center justify-between rounded-xl border border-border/60 bg-card/40 px-3.5 py-3 text-xs">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <UsersRound className="h-4 w-4 text-primary" />
                    Usuários da empresa
                  </span>
                  <strong>
                    {status.users_used} de {status.user_limit}
                  </strong>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-destructive">Assinatura não encontrada para esta empresa.</p>
        )}
      </Card>

      <div className="mb-7 text-center">
        <Badge variant="outline" className="border-primary/25 bg-primary/5 px-4 py-2 text-primary">
          Planos simples, sem fidelidade
        </Badge>
        <h2 className="mx-auto mt-4 max-w-3xl font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Mais leads no radar. Mais conversas. Mais chances de vender.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Todos os seus dados continuam no mesmo lugar. Você só escolhe o volume ideal para a sua
          próxima fase.
        </p>
      </div>

      <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const current = plan.code === status?.plan_code;
          const presentation = planPresentation[plan.code];
          const Icon = presentation.icon;
          const featured = plan.code === "plus";
          return (
            <Card
              key={plan.code}
              className={`group relative flex flex-col overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1.5 ${
                featured
                  ? "border-primary/60 bg-[linear-gradient(155deg,hsl(var(--primary)/0.12),hsl(var(--card))_42%)] shadow-[0_28px_80px_-35px_hsl(var(--primary)/0.65)] xl:-my-3 xl:py-9"
                  : ""
              } ${current ? "ring-2 ring-primary/45" : ""}`}
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />

              <div className="relative flex items-start justify-between gap-3">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-2xl ${
                    featured ? "bg-primary shadow-glow" : "bg-primary/10"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${featured ? "text-primary-foreground" : "text-primary"}`}
                  />
                </span>
                {current ? (
                  <Badge>Seu plano</Badge>
                ) : featured ? (
                  <Badge className="shadow-glow">Recomendado</Badge>
                ) : null}
              </div>

              <div className="relative mt-5">
                <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-primary">
                  {presentation.tagline}
                </p>
              </div>

              <p className="relative mt-6 font-display text-3xl font-bold tracking-tight">
                {plan.monthly_price_cents === 0
                  ? "Grátis"
                  : (plan.monthly_price_cents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                {plan.monthly_price_cents > 0 && (
                  <span className="ml-1 text-xs font-medium text-muted-foreground">/mês</span>
                )}
              </p>

              <div className="relative mt-5 rounded-2xl border border-border/70 bg-background/30 p-4">
                <p className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                  Capacidade
                </p>
                <div className="mt-2 space-y-2">
                  <p className="font-display text-xl font-bold">
                    {plan.leads_per_month.toLocaleString("pt-BR")} leads
                  </p>
                  <div className="h-px bg-border/60" />
                  <p className="flex items-center gap-2 text-xs font-semibold">
                    <UsersRound className="h-3.5 w-3.5 text-primary" />
                    {plan.user_limit} {plan.user_limit === 1 ? "usuário" : "usuários"}
                  </p>
                  <p className="text-[0.68rem] text-muted-foreground">
                    {plan.admin_limit === 0
                      ? "Somente o Proprietário"
                      : `Até ${plan.admin_limit} ${
                          plan.admin_limit === 1 ? "Administrador" : "Administradores"
                        }`}
                  </p>
                </div>
              </div>

              <p className="relative mt-5 min-h-16 text-xs leading-relaxed text-muted-foreground">
                {presentation.description}
              </p>

              <div className="relative my-5 h-px bg-border/70" />

              <div className="relative flex-1 space-y-3">
                <div className="flex items-start gap-2.5 text-xs">
                  <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10">
                    <Check className="h-3 w-3 text-primary" />
                  </span>
                  {plan.user_limit === 1
                    ? "1 Proprietário"
                    : `${plan.user_limit} usuários no total`}
                </div>
                {presentation.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5 text-xs">
                    <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10">
                      <Check className="h-3 w-3 text-primary" />
                    </span>
                    {feature}
                  </div>
                ))}
              </div>

              <Button
                className="relative mt-7 w-full gap-2"
                variant={current || plan.code === "free" ? "outline" : "default"}
                disabled={current || plan.code === "free" || !canManage || busyPlan !== null}
                onClick={() => choosePlan(plan.code)}
              >
                {current
                  ? "Plano atual"
                  : plan.code === "free"
                    ? "Plano de entrada"
                    : `Escolher ${plan.name.replace("LeadFlow ", "")}`}
                {!current && plan.code !== "free" && <ArrowRight className="h-4 w-4" />}
              </Button>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col items-center justify-between gap-5 rounded-2xl border border-border/70 bg-card/60 p-5 sm:flex-row sm:px-7">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </span>
          <div>
            <p className="text-sm font-semibold">Assinatura segura e sob seu controle</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pagamento pela Stripe. Troque o cartão, altere o plano ou cancele online.
            </p>
          </div>
        </div>
        {!canManage && (
          <p className="max-w-sm text-xs text-muted-foreground">
            Apenas o proprietário ou administrador da empresa pode alterar o plano.
          </p>
        )}
      </div>
    </div>
  );
}
