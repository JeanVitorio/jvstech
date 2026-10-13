import { useState } from "react";
import { AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import type { PlanCode } from "@/types/billing";

const planDetails: Record<PlanCode, { name: string; price: string }> = {
  free: { name: "LeadFlow Free", price: "50 leads por mês" },
  basic: { name: "LeadFlow Básico", price: "R$ 197/mês" },
  plus: { name: "LeadFlow Plus", price: "R$ 397/mês" },
  pro: { name: "LeadFlow Pro", price: "R$ 597/mês" },
};

const inputClass =
  "h-12 rounded-xl border-white/10 bg-white/[0.06] text-white shadow-none placeholder:text-white/25 focus-visible:border-primary/60 focus-visible:ring-primary/20";

export default function SignupPremium() {
  const { user, ready, signup } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedPlan = searchParams.get("plan");
  const selectedPlan: PlanCode =
    requestedPlan && Object.prototype.hasOwnProperty.call(planDetails, requestedPlan)
      ? (requestedPlan as PlanCode)
      : "free";
  const destination = selectedPlan === "free" ? "/" : `/billing?plan=${selectedPlan}&onboarding=1`;
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!ready) return null;
  if (user) return <Navigate to={destination} replace />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (companyName.trim().length < 2) {
      setError("Informe o nome da empresa.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter ao menos 8 caracteres.");
      return;
    }
    setBusy(true);
    const result = await signup(name, companyName, email, password, selectedPlan);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível criar sua conta.");
      return;
    }
    if (result.confirmation) {
      setMessage("Enviamos um link de confirmação para o seu e-mail.");
    }
  }

  return (
    <AuthShell
      eyebrow="Crie sua conta"
      title="Comece a prospectar hoje."
      description="Configure sua empresa em poucos segundos. Você pode começar gratuitamente e evoluir quando precisar."
    >
      <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-primary/25 bg-primary/[0.08] p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs text-white/40">Plano selecionado</p>
            <p className="font-display text-sm font-bold text-white">
              {planDetails[selectedPlan].name}
            </p>
          </div>
        </div>
        <p className="text-right text-xs font-semibold text-primary">
          {planDetails[selectedPlan].price}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="company" className="text-xs text-white/65">
          Nome da empresa
        </Label>
        <Input
          id="company"
          value={companyName}
          onChange={(event) => {
            setCompanyName(event.target.value);
            setError(null);
          }}
          placeholder="Ex.: JVS Tecnologia"
          className={inputClass}
          required
        />
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs text-white/65">
            Seu nome
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Como podemos chamar você?"
            className={inputClass}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="signup-email" className="text-xs text-white/65">
              E-mail
            </Label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@empresa.com"
              className={inputClass}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password" className="text-xs text-white/65">
              Senha
            </Label>
            <Input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo de 8 caracteres"
              className={inputClass}
              required
            />
          </div>
        </div>

        {error && (
          <p className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            {message}
          </p>
        )}

        <Button
          className="h-12 w-full gap-2 rounded-xl text-sm font-bold shadow-glow transition-transform hover:scale-[1.01]"
          disabled={busy}
        >
          {busy
            ? "Criando sua conta..."
            : selectedPlan === "free"
              ? "Criar conta grátis"
              : "Criar conta e assinar"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-white/45">
        Já possui uma conta?{" "}
        <Link
          to={`/login?plan=${selectedPlan}`}
          className="font-semibold text-primary hover:text-primary/80"
        >
          Entrar
        </Link>
      </p>
      <p className="mt-4 text-center text-[0.68rem] leading-relaxed text-white/25">
        Ao continuar, você concorda com o processamento seguro dos dados da sua conta.
      </p>
    </AuthShell>
  );
}
