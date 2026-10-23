import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOnlineRunners } from "@/hooks/useBots";
import { useWhatsappRunnerSessions } from "@/hooks/useWhatsappValidation";
import { runnerWhatsappSession } from "@/services/whatsappValidation";
import type { BotRuntime } from "@/types/bots";
import { WhatsappConnectCard } from "./WhatsappConnectCard";

// Escolha do PC que executará o agente; exige WhatsApp de validação quando o agente salva telefones.
export function StartBotDialog({
  runtime,
  busy,
  canGenerate,
  onClose,
  onStart,
}: {
  runtime: BotRuntime | null;
  busy: boolean;
  canGenerate: boolean;
  onClose: () => void;
  onStart: (runnerId: string) => void;
}) {
  const runners = useOnlineRunners();
  const sessions = useWhatsappRunnerSessions();
  const [runnerId, setRunnerId] = useState("");

  const botId = runtime?.config.id;
  useEffect(() => {
    setRunnerId("");
  }, [botId]);

  // Com um único PC disponível, já deixa selecionado.
  useEffect(() => {
    if (botId && !runnerId && runners.data?.length === 1) setRunnerId(runners.data[0].id);
  }, [botId, runnerId, runners.data]);

  const runner = runners.data?.find((item) => item.id === runnerId);
  const needsWhatsapp = runtime?.config.phone_filter !== "without";
  // Se a consulta falhar, não bloqueia: a importação segura os leads até validar.
  const whatsappReady =
    !needsWhatsapp ||
    sessions.isError ||
    runnerWhatsappSession(sessions.data, runnerId)?.status === "ready";

  return (
    <Dialog open={Boolean(runtime)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl rounded-[1.75rem]">
        <DialogHeader>
          <DialogTitle>Iniciar agente</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Escolha o PC que realizará a prospecção.
        </p>
        <Select value={runnerId} onValueChange={setRunnerId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um PC com o app aberto" />
          </SelectTrigger>
          <SelectContent>
            {(runners.data ?? []).map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name} · {item.environment}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!runners.isLoading && !runners.data?.length && (
          <p className="text-sm text-warning">
            Nenhum PC com o app LeadFlow aberto agora. Abra o app no computador que vai
            executar o agente.{" "}
            <Link to="/installation" className="font-semibold underline underline-offset-2">
              Ver instalação
            </Link>
          </p>
        )}

        {runner && needsWhatsapp && !whatsappReady && (
          <div className="space-y-3">
            <p className="rounded-2xl bg-primary/[0.08] px-4 py-3 text-sm">
              <strong>Conecte o WhatsApp deste PC para iniciar.</strong>{" "}
              <span className="text-muted-foreground">
                Este agente só salva leads com WhatsApp validado, e o app precisa de um WhatsApp
                conectado para conferir os números.
              </span>
            </p>
            <WhatsappConnectCard runnerId={runner.id} runnerName={runner.name} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => onStart(runnerId)}
            disabled={!runnerId || busy || !canGenerate || !whatsappReady}
          >
            Iniciar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
