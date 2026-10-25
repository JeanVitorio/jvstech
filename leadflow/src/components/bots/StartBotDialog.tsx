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
import { AppLoader } from "@/components/AppLoader";
import type { BotRuntime } from "@/types/bots";

// Escolha do PC que executará o agente.
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
  const [runnerId, setRunnerId] = useState("");

  const botId = runtime?.config.id;
  useEffect(() => {
    setRunnerId("");
  }, [botId]);

  // Com um único PC disponível, já deixa selecionado.
  useEffect(() => {
    if (botId && !runnerId && runners.data?.length === 1) setRunnerId(runners.data[0].id);
  }, [botId, runnerId, runners.data]);

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
        {runners.isLoading && <AppLoader variant="compact" label="Procurando PCs" />}
        {!runners.isLoading && !runners.data?.length && (
          <p className="text-sm text-warning">
            Nenhum PC com o app LeadFlow aberto agora. Abra o app no computador que vai
            executar o agente.{" "}
            <Link to="/installation" className="font-semibold underline underline-offset-2">
              Ver instalação
            </Link>
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => onStart(runnerId)}
            disabled={!runnerId || busy || !canGenerate}
          >
            Iniciar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
