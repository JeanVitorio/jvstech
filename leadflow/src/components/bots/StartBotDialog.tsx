import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, MonitorSmartphone, RefreshCw } from "lucide-react";
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

const PASSOS = [
  "Instale o app LeadFlow no computador que vai prospectar.",
  "Abra o app e entre com este mesmo e-mail e senha.",
  "Deixe o app aberto e volte aqui para tentar de novo.",
];

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

  const procurando = runners.isLoading || runners.isFetching;
  const semPc = !procurando && !runners.data?.length;

  return (
    <Dialog open={Boolean(runtime)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl rounded-[1.75rem]">
        <DialogHeader>
          <DialogTitle>Iniciar agente</DialogTitle>
        </DialogHeader>

        {procurando && <AppLoader variant="compact" label="Procurando PCs" />}

        {/* Sem PC conectado não há o que escolher: explicamos o que fazer. */}
        {semPc ? (
          <div className="rounded-2xl border border-warning/40 bg-warning/5 p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
                <MonitorSmartphone className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">Nenhum PC com o app aberto</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  O agente trabalha dentro do app LeadFlow para Windows. Sem um computador
                  com o app aberto, não há onde executar a prospecção.
                </p>
              </div>
            </div>

            <ol className="mt-4 space-y-2">
              {PASSOS.map((passo, indice) => (
                <li key={passo} className="flex items-center gap-3 text-sm">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {indice + 1}
                  </span>
                  {passo}
                </li>
              ))}
            </ol>

            <Button asChild className="mt-4 h-10 w-full gap-2 rounded-xl font-semibold">
              <Link to="/installation">
                <Download className="h-4 w-4" /> Ver como instalar o app
              </Link>
            </Button>
          </div>
        ) : (
          !procurando && (
            <>
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
            </>
          )
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {semPc ? "Fechar" : "Cancelar"}
          </Button>
          {semPc ? (
            <Button
              className="gap-2"
              disabled={procurando}
              onClick={() => void runners.refetch()}
            >
              <RefreshCw className={`h-4 w-4 ${procurando ? "animate-spin" : ""}`} />
              Tentar novamente
            </Button>
          ) : (
            <Button
              onClick={() => onStart(runnerId)}
              disabled={!runnerId || busy || !canGenerate}
            >
              Iniciar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
