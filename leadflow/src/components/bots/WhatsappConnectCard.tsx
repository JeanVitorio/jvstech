import { CheckCircle2, Loader2, Monitor, QrCode, RefreshCw, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useWhatsappRunnerSessions,
  useWhatsappValidationActions,
} from "@/hooks/useWhatsappValidation";
import { formatBrazilianPhoneInput } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { runnerWhatsappSession } from "@/services/whatsappValidation";

const phoneSteps = [
  "Abra o WhatsApp no celular",
  "Toque em Mais opções (⋮) ou em Configurações",
  "Entre em Aparelhos conectados › Conectar um aparelho",
  "Aponte a câmera para este código",
];

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Não foi possível conectar o WhatsApp.";

// Conecta, por QR Code, o WhatsApp usado só para conferir os números dos leads neste PC.
export function WhatsappConnectCard({
  runnerId,
  runnerName,
  className,
}: {
  runnerId: string;
  runnerName: string;
  className?: string;
}) {
  const sessions = useWhatsappRunnerSessions();
  const { connect, disconnect } = useWhatsappValidationActions();
  const session = runnerWhatsappSession(sessions.data, runnerId);
  const status = session?.status ?? "disconnected";
  const busy = connect.isPending || disconnect.isPending;

  async function handleConnect() {
    try {
      await connect.mutateAsync(runnerId);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function handleReplace() {
    if (!session || !confirm("Desconectar este WhatsApp para conectar outro número?")) return;
    try {
      await disconnect.mutateAsync(session.id);
      await connect.mutateAsync(runnerId);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className={cn("rounded-3xl border border-border/70 bg-card/70 p-4 backdrop-blur-xl", className)}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Monitor className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold">{runnerName}</p>
          <p
            className={cn(
              "flex items-center gap-1.5 text-xs",
              status === "ready" ? "text-success" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                status === "ready"
                  ? "bg-success"
                  : status === "qr_pending" || status === "connecting"
                    ? "animate-pulse bg-primary"
                    : "bg-muted-foreground/50",
              )}
            />
            {status === "ready"
              ? `WhatsApp conectado${
                  session?.connected_number
                    ? ` · +55 ${formatBrazilianPhoneInput(session.connected_number)}`
                    : ""
                }`
              : status === "qr_pending"
                ? "Aguardando leitura do QR Code"
                : status === "connecting"
                  ? "Abrindo o WhatsApp neste PC..."
                  : "WhatsApp não conectado"}
          </p>
        </div>
        {status === "ready" && session?.purpose === "validation" && (
          <Button variant="ghost" size="sm" className="rounded-full" disabled={busy} onClick={handleReplace}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Trocar número
          </Button>
        )}
        {(status === "disconnected" || status === "error") && (
          <Button size="sm" className="rounded-full px-4" disabled={busy || sessions.isLoading} onClick={handleConnect}>
            {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <QrCode className="mr-1.5 h-3.5 w-3.5" />}
            Conectar WhatsApp
          </Button>
        )}
      </div>

      {session?.last_error && (status === "disconnected" || status === "error") && (
        <p className="mt-3 rounded-2xl bg-warning/10 px-3 py-2 text-xs text-warning">
          {session.last_error}
        </p>
      )}

      {status === "connecting" && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-muted/40 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Gerando o QR Code no seu PC...
        </div>
      )}

      {status === "qr_pending" && session?.qr_code_data_url && (
        <div className="mt-4 grid animate-fade-in items-center gap-5 sm:grid-cols-[auto_1fr]">
          <div className="mx-auto rounded-3xl bg-white p-3 shadow-elegant ring-1 ring-black/5">
            <img
              src={session.qr_code_data_url}
              alt="QR Code para conectar o WhatsApp"
              className="h-48 w-48"
            />
          </div>
          <ol className="space-y-2.5">
            {phoneSteps.map((step, index) => (
              <li key={step} className="flex items-start gap-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
            <li className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5" /> O código se renova sozinho a cada poucos segundos.
            </li>
          </ol>
        </div>
      )}

      {status === "ready" && session?.purpose === "message" && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          Usando o WhatsApp dos agentes de mensagem deste PC.
        </p>
      )}
    </div>
  );
}
