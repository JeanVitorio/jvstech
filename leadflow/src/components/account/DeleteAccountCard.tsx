import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const CONFIRMATION_TEXT = "EXCLUIR";

// Exclusão definitiva da conta (LGPD). O dono apaga a empresa inteira.
export function DeleteAccountCard() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const isOwner = user?.tenant_role === "owner";
  const canSubmit = confirmation === CONFIRMATION_TEXT && password.length > 0 && !busy;

  function close(next: boolean) {
    if (busy) return;
    setOpen(next);
    if (!next) {
      setPassword("");
      setConfirmation("");
    }
  }

  async function deleteAccount() {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { password, confirmation },
      });
      let message = (data as { error?: string } | null)?.error ?? "";
      if (error) {
        message = "Não foi possível excluir a conta. Tente novamente.";
        if ("context" in error && error.context instanceof Response) {
          const response = await error.context.json().catch(() => null);
          if (response?.error) message = response.error;
        }
      }
      if (message) {
        toast.error(message);
        return;
      }
      toast.success("Conta excluída. Seus dados foram apagados.");
      await logout().catch(() => undefined);
      window.location.assign("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6 lg:col-span-3 space-y-3 border-destructive/40">
      <div className="flex items-center gap-2">
        <Trash2 className="w-4 h-4 text-destructive" />
        <h3 className="font-display font-semibold">Excluir minha conta</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        {isOwner
          ? "Apaga de forma definitiva a sua empresa no LeadFlow: leads, agentes, colaboradores, histórico e assinatura. A assinatura é encerrada na hora, sem novas cobranças."
          : "Apaga de forma definitiva o seu login e os seus dados pessoais. Os leads e agentes da empresa continuam com o responsável pela conta."}
      </p>
      <div className="flex justify-end">
        <Button type="button" variant="destructive" className="gap-2" onClick={() => setOpen(true)}>
          <Trash2 className="w-4 h-4" /> Excluir conta
        </Button>
      </div>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Excluir conta definitivamente
            </DialogTitle>
            <DialogDescription>
              {isOwner
                ? "Todos os dados da empresa e os logins dos colaboradores serão apagados. Não é possível desfazer."
                : "Seu login e seus dados pessoais serão apagados. Não é possível desfazer."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="delete-account-password">Sua senha</Label>
              <Input
                id="delete-account-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="delete-account-confirmation">
                Digite {CONFIRMATION_TEXT} para confirmar
              </Label>
              <Input
                id="delete-account-confirmation"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value.toUpperCase())}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={deleteAccount} disabled={!canSubmit}>
              {busy ? "Excluindo..." : "Excluir para sempre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
