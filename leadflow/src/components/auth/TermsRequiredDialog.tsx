import { useState } from "react";
import { AlertCircle, FileCheck2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { TermsConsentField } from "./TermsConsentField";

// Contas sem aceite da versão vigente dos Termos precisam aceitar para seguir.
export function TermsRequiredDialog() {
  const { user, acceptTerms, logout } = useAuth();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user || user.terms_accepted) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!checked) {
      setError("Marque a caixa para aceitar os Termos e a Política de Privacidade.");
      return;
    }
    setBusy(true);
    const result = await acceptTerms();
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Não foi possível registrar o aceite.");
  }

  return (
    <AlertDialog open>
      <AlertDialogContent onEscapeKeyDown={(event) => event.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-primary" aria-hidden="true" />
            Atualizamos nossos termos
          </AlertDialogTitle>
          <AlertDialogDescription>
            Publicamos os Termos de Uso, a Política de Privacidade e a Política de Reembolso do
            LeadFlow. Para continuar usando o sistema, leia e confirme o aceite.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <TermsConsentField
            id="required-terms"
            checked={checked}
            onCheckedChange={(value) => {
              setChecked(value);
              setError(null);
            }}
          />
          {error && (
            <p className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" className="sm:flex-1" onClick={logout}>
              Sair
            </Button>
            <Button type="submit" className="sm:flex-1" disabled={busy}>
              {busy ? "Registrando..." : "Aceitar e continuar"}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
