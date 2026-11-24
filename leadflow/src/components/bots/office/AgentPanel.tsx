import {
  Building2,
  History,
  MapPin,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Square,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { botStatusLabel, botVisualStatus, isBotActive } from "@/lib/bots";
import type { BotRuntime } from "@/types/bots";

interface AgentPanelProps {
  runtime: BotRuntime | null;
  generatedLeads?: number;
  busy?: boolean;
  showOwner?: boolean;
  onClose: () => void;
  onStart: () => void;
  onCommand: (command: "pausado" | "rodando" | "parado") => void;
  onEdit: () => void;
  onShowEvents: () => void;
}

const CLASSE_STATUS: Record<string, string> = {
  running: "bg-success/15 text-success",
  paused: "bg-warning/15 text-warning",
  starting: "bg-primary/15 text-primary",
  stopping: "bg-warning/15 text-warning",
  failed: "bg-destructive/15 text-destructive",
  completed: "bg-success/15 text-success",
  offline: "bg-destructive/15 text-destructive",
  idle: "bg-muted text-muted-foreground",
};

// Tudo o que ficava no cartão agora abre ao clicar na mesa do agente.
export function AgentPanel({
  runtime,
  generatedLeads,
  busy,
  showOwner,
  onClose,
  onStart,
  onCommand,
  onEdit,
  onShowEvents,
}: AgentPanelProps) {
  if (!runtime) return null;

  const { config } = runtime;
  const scraper = runtime.checkpoints.scraper;
  const importador = runtime.checkpoints.importador;
  const estado = scraper?.state ?? {};
  const estadoImportador = importador?.state ?? {};
  const status = botVisualStatus(runtime);
  const ativo = isBotActive(runtime);
  const cidadeAtual = Number(estado.indice_cidade || 0);
  const totalCidades = Number(estado.total_cidades || config.cities.length || 0);
  const empresas = Number(
    estado.total_itens || estado.ultima_cidade_total_empresas || 0,
  );
  const progressoCidades = totalCidades
    ? Math.round((cidadeAtual / totalCidades) * 100)
    : 0;
  const limite = config.max_leads;
  const leads = generatedLeads ?? 0;
  const progressoLeads = limite
    ? Math.min(100, Math.round((leads / limite) * 100))
    : 0;
  const limiteAtingido = limite != null && leads >= limite;

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onClose()}>
      {/* Só o miolo rola: os botões de ação ficam sempre à vista. */}
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex flex-wrap items-center gap-3">
            {config.name}
            <Badge className={`border-0 ${CLASSE_STATUS[status]}`}>
              {botStatusLabel(status)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <p className="px-6 pt-1 text-sm text-muted-foreground">
          {config.niche} · {config.cities.length} cidade(s)
          {showOwner && ` · ${config.owner_email}`}
        </p>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div>
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-muted-foreground">Progresso das cidades</span>
              <span className="font-semibold">
                {cidadeAtual} de {totalCidades}
              </span>
            </div>
            <Progress value={progressoCidades} className="h-2" />
          </div>

          {generatedLeads !== undefined && (
            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-muted-foreground">Leads gerados</span>
                <span className={`font-semibold ${limiteAtingido ? "text-warning" : ""}`}>
                  {limite
                    ? `${leads.toLocaleString("pt-BR")} de ${limite.toLocaleString("pt-BR")}`
                    : `${leads.toLocaleString("pt-BR")} · sem limite`}
                </span>
              </div>
              {limite != null && <Progress value={progressoLeads} className="h-2" />}
              {limiteAtingido && (
                <p className="mt-1.5 text-xs text-warning">
                  Limite atingido. Edite o agente para aumentar o limite.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Quadro icone={MapPin} titulo="Cidade atual">
              {estado.cidade_atual || estado.ultima_cidade || "—"}
            </Quadro>
            <Quadro icone={Building2} titulo="Empresas encontradas">
              {empresas}
            </Quadro>
            <Quadro icone={Users} titulo="Leads na base">
              {leads.toLocaleString("pt-BR")}
            </Quadro>
          </div>

          <div className="space-y-1.5 rounded-lg bg-muted/40 p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Atividade: </span>
              {estado.atividade_atual || "Aguardando execução"}
            </p>
            <p>
              <span className="text-muted-foreground">Importador: </span>
              {estadoImportador.atividade_atual || importador?.status || "Aguardando"}
            </p>
            <p className="text-xs text-muted-foreground">
              Executor: {estado.executor?.id || runtime.runner?.name || "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border bg-background/60 px-6 py-4">
          <Button size="sm" onClick={onStart} disabled={ativo || busy}>
            <Play className="mr-1 h-3.5 w-3.5" /> Iniciar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCommand("pausado")}
            disabled={!["running", "starting"].includes(status) || busy}
          >
            <Pause className="mr-1 h-3.5 w-3.5" /> Pausar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCommand("rodando")}
            disabled={status !== "paused" || busy}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Continuar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCommand("parado")}
            disabled={!ativo || status === "stopping" || busy}
          >
            <Square className="mr-1 h-3.5 w-3.5" /> Parar
          </Button>
          <Button size="sm" variant="ghost" onClick={onShowEvents}>
            <History className="mr-1 h-3.5 w-3.5" /> Eventos
          </Button>
          <Button size="sm" className="ml-auto" onClick={onEdit} disabled={ativo}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> Editar agente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Quadro({
  icone: Icone,
  titulo,
  children,
}: {
  icone: typeof MapPin;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icone className="h-3.5 w-3.5" /> {titulo}
      </p>
      <p className="mt-1 truncate font-medium">{children}</p>
    </div>
  );
}
