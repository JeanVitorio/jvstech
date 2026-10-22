import { useState } from "react";
import { AlertCircle, MessageCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { formatBrazilianPhoneInput, isValidBrazilianWhatsapp } from "@/lib/whatsapp";

// Contas criadas antes do WhatsApp obrigatório precisam informar o número para seguir.
export function WhatsappRequiredDialog() {
  const { user, updateWhatsapp } = useAuth();
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user || isValidBrazilianWhatsapp(user.phone)) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!isValidBrazilianWhatsapp(whatsapp)) {
      setError("Informe um WhatsApp válido com DDD. Ex.: (11) 99999-9999.");
      return;
    }
    setBusy(true);
    const result = await updateWhatsapp(whatsapp);
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Não foi possível salvar seu WhatsApp.");
  }

  return (
    <AlertDialog open>
      <AlertDialogContent onEscapeKeyDown={(event) => event.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" />
            Informe seu WhatsApp
          </AlertDialogTitle>
          <AlertDialogDescription>
            Precisamos do seu WhatsApp para falar com você sobre sua conta, suporte e novidades do
            LeadFlow.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="required-whatsapp">WhatsApp</Label>
            <Input
              id="required-whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              value={whatsapp}
              onChange={(event) => {
                setWhatsapp(formatBrazilianPhoneInput(event.target.value));
                setError(null);
              }}
              placeholder="(11) 99999-9999"
              autoFocus
              required
            />
          </div>
          {error && (
            <p className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Salvando..." : "Salvar e continuar"}
          </Button>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
