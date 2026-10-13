import { useState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { AuthShell, GoogleIcon } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import type { PlanCode } from "@/types/billing";

const inputClass =
  "h-12 rounded-xl border-white/10 bg-white/[0.06] text-white shadow-none placeholder:text-white/25 focus-visible:border-primary/60 focus-visible:ring-primary/20";

export default function LoginPremium() {
  const { user, ready, login, loginWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedPlan = searchParams.get("plan");
  const paidPlan =
    requestedPlan && ["basic", "plus", "pro"].includes(requestedPlan)
      ? (requestedPlan as Exclude<PlanCode, "free">)
      : null;
  const destination = paidPlan ? `/billing?plan=${paidPlan}&onboarding=1` : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"google" | "email" | null>(null);

  if (!ready) return null;
  if (user) return <Navigate to={destination} replace />;

  async function handleGoogle() {
    setError(null);
    setBusy("google");
    const result = await loginWithGoogle(undefined, paidPlan ?? "free");
    if (!result.ok) {
      setBusy(null);
      setError(result.error ?? "Não foi possível entrar com o Google.");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy("email");
    const result = await login(email, password);
    setBusy(null);
    if (!result.ok) setError(result.error ?? "Não foi possível entrar.");
  }

  return (
    <AuthShell
      eyebrow="Bem-vindo de volta"
      title="Entre no LeadFlow."
      description="Acesse sua prospecção, acompanhe as oportunidades e continue de onde parou."
    >
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogle}
        disabled={busy !== null}
        className="h-12 w-full gap-3 rounded-xl border-white/15 bg-white text-sm font-semibold text-black shadow-sm transition-transform hover:scale-[1.01] hover:bg-white/90"
      >
        <GoogleIcon />
        {busy === "google" ? "Conectando..." : "Continuar com Google"}
      </Button>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-[0.68rem] uppercase tracking-[0.16em] text-white/30">
          ou entre com e-mail
        </span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs text-white/65">
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
            placeholder="voce@empresa.com"
            className={inputClass}
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password" className="text-xs text-white/65">
              Senha
            </Label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary hover:text-primary/80"
            >
              Esqueci minha senha
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
            placeholder="Sua senha"
            className={inputClass}
            required
          />
        </div>

        {error && (
          <p className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="h-12 w-full gap-2 rounded-xl text-sm font-bold shadow-glow transition-transform hover:scale-[1.01]"
          disabled={busy !== null}
        >
          {busy === "email" ? "Entrando..." : "Entrar na minha conta"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-white/45">
        Ainda não possui conta?{" "}
        <Link
          to={requestedPlan ? `/signup?plan=${requestedPlan}` : "/signup"}
          className="font-semibold text-primary hover:text-primary/80"
        >
          Começar grátis
        </Link>
      </p>
    </AuthShell>
  );
}
