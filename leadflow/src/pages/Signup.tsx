import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { AlertCircle, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlanCode } from "@/types/billing";

const planDetails: Record<PlanCode, { name: string; price: string }> = {
  free: { name: "LeadFlow Free", price: "50 leads/mês" },
  basic: { name: "LeadFlow Básico", price: "R$ 197/mês" },
  plus: { name: "LeadFlow Plus", price: "R$ 397/mês" },
  pro: { name: "LeadFlow Pro", price: "R$ 597/mês" },
};

export default function Signup() {
  const { user, ready, signup } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedPlan = searchParams.get("plan");
  const selectedPlan: PlanCode = requestedPlan &&
      Object.prototype.hasOwnProperty.call(planDetails, requestedPlan)
    ? requestedPlan as PlanCode
    : "free";
  const destination = selectedPlan === "free"
    ? "/"
    : `/billing?plan=${selectedPlan}&onboarding=1`;
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
    if (password.length < 8) {
      setError("A senha deve ter ao menos 8 caracteres.");
      return;
    }
    setBusy(true);
    const result = await signup(
      name,
      companyName,
      email,
      password,
      selectedPlan,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível criar sua conta.");
      return;
    }
    if (result.confirmation) {
      setMessage(
        "Confira seu e-mail para confirmar a conta e continuar com o plano.",
      );
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-7">
          <Logo size={56} />
          <div className="text-center">
            <h1 className="font-display font-bold text-2xl">
              Criar conta no LeadFlow
            </h1>
            <p className="text-sm text-muted-foreground">
              Cadastre sua empresa para continuar.
            </p>
          </div>
        </div>
        <Card className="p-5 sm:p-6">
          <div className="mb-5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="text-xs text-muted-foreground">Plano selecionado</p>
            <p className="font-display font-semibold">
              {planDetails[selectedPlan].name}
            </p>
            <p className="text-xs text-primary">
              {planDetails[selectedPlan].price}
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="name">Seu nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="signup-email">E-mail</Label>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="signup-password">Senha</Label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error && (
              <p className="flex gap-2 text-xs text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </p>
            )}
            {message && (
              <p className="text-sm text-success">{message}</p>
            )}
            <Button className="w-full gap-2" disabled={busy}>
              <UserPlus className="w-4 h-4" />
              {busy
                ? "Criando..."
                : selectedPlan === "free"
                ? "Criar conta grátis"
                : "Criar conta e continuar"}
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-5">
            Já possui conta?{" "}
            <Link
              to={`/login?plan=${selectedPlan}`}
              className="text-primary hover:underline"
            >
              Entrar
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
