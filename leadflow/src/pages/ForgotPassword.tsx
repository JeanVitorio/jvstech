import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { KeyRound, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPassword() {
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const [etapa, setEtapa] = useState<"email" | "codigo">("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const [pronto, setPronto] = useState(false);

  if (pronto) return <Navigate to="/" replace />;

  async function enviarCodigo(event: React.FormEvent) {
    event.preventDefault();
    setErro("");
    setBusy(true);
    const resultado = await requestPasswordReset(email);
    setBusy(false);
    if (!resultado.ok) {
      setErro(resultado.error ?? "Não foi possível enviar o código.");
      return;
    }
    setEtapa("codigo");
    setAviso(`Se existir uma conta com ${email.trim()}, o código chegou por e-mail.`);
  }

  async function salvarSenha(event: React.FormEvent) {
    event.preventDefault();
    setErro("");
    if (senha.length < 8) {
      setErro("A senha deve ter ao menos 8 caracteres.");
      return;
    }
    setBusy(true);
    const resultado = await confirmPasswordReset(email, codigo, senha);
    setBusy(false);
    if (!resultado.ok) {
      setErro(resultado.error ?? "Não foi possível salvar a nova senha.");
      return;
    }
    setPronto(true);
  }

  async function reenviar() {
    setErro("");
    setAviso("");
    setBusy(true);
    const resultado = await requestPasswordReset(email);
    setBusy(false);
    if (!resultado.ok) {
      setErro(resultado.error ?? "Não foi possível enviar o código.");
      return;
    }
    setAviso("Enviamos um novo código.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><Logo size={56} /></div>
        <Card className="p-6">
          <h1 className="font-display text-xl font-bold">Recuperar senha</h1>

          {etapa === "email" ? (
            <>
              <p className="text-sm text-muted-foreground mt-1 mb-5">
                Informe seu e-mail e enviaremos um código de 6 dígitos.
              </p>
              <form onSubmit={enviarCodigo} className="space-y-4">
                <div>
                  <Label htmlFor="reset-email">E-mail</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                {erro && <p className="text-sm text-destructive">{erro}</p>}
                <Button className="w-full gap-2" disabled={busy}>
                  <Mail className="w-4 h-4" />
                  {busy ? "Enviando..." : "Enviar código"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mt-1 mb-5">
                {aviso || "Digite o código que enviamos e escolha a nova senha."}
              </p>
              <form onSubmit={salvarSenha} className="space-y-4">
                <div>
                  <Label htmlFor="reset-code">Código recebido</Label>
                  <Input
                    id="reset-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength={6}
                    className="tracking-[0.5em] text-center text-lg"
                    value={codigo}
                    onChange={(event) =>
                      setCodigo(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="reset-password">Nova senha</Label>
                  <Input
                    id="reset-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={senha}
                    onChange={(event) => setSenha(event.target.value)}
                    required
                  />
                </div>
                {erro && <p className="text-sm text-destructive">{erro}</p>}
                <Button className="w-full gap-2" disabled={busy || codigo.length < 6}>
                  <KeyRound className="w-4 h-4" />
                  {busy ? "Salvando..." : "Salvar nova senha"}
                </Button>
              </form>
              <div className="mt-4 flex items-center justify-between text-xs">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => { setEtapa("email"); setErro(""); setAviso(""); }}
                >
                  Trocar e-mail
                </button>
                <button
                  type="button"
                  className="text-primary disabled:opacity-50"
                  onClick={reenviar}
                  disabled={busy}
                >
                  Reenviar código
                </button>
              </div>
            </>
          )}

          <Link to="/login" className="block text-sm text-center text-primary mt-5">
            Voltar ao login
          </Link>
        </Card>
      </div>
    </div>
  );
}
