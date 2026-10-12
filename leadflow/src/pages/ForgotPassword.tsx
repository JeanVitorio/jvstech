import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await requestPasswordReset(email);
    setBusy(false);
    setMessage(
      result.ok
        ? "Se a conta existir, você receberá um link de recuperação."
        : result.error ?? "Não foi possível enviar o link.",
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><Logo size={56} /></div>
        <Card className="p-6">
          <h1 className="font-display text-xl font-bold">
            Recuperar senha
          </h1>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            Enviaremos um link seguro para seu e-mail.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="reset-email">E-mail</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            {message && <p className="text-sm">{message}</p>}
            <Button className="w-full gap-2" disabled={busy}>
              <Mail className="w-4 h-4" />
              {busy ? "Enviando..." : "Enviar link"}
            </Button>
          </form>
          <Link
            to="/login"
            className="block text-sm text-center text-primary mt-5"
          >
            Voltar ao login
          </Link>
        </Card>
      </div>
    </div>
  );
}
