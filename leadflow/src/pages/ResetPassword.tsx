import { useState } from "react";
import { Navigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPassword() {
  const { session, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (done) return <Navigate to="/" replace />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setMessage("A senha deve ter ao menos 8 caracteres.");
      return;
    }
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error ?? "Não foi possível atualizar a senha.");
      return;
    }
    setDone(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><Logo size={56} /></div>
        <Card className="p-6">
          <h1 className="font-display text-xl font-bold">Nova senha</h1>
          {!session ? (
            <p className="text-sm text-destructive mt-4">
              Link inválido ou expirado. Solicite uma nova recuperação.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4 mt-5">
              <div>
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              {message && <p className="text-sm text-destructive">{message}</p>}
              <Button className="w-full gap-2" disabled={busy}>
                <KeyRound className="w-4 h-4" />
                {busy ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
