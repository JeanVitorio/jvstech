import {
  Activity,
  Building2,
  History,
  MapPin,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Square,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  botStatusLabel,
  botVisualStatus,
  isBotActive,
} from "@/lib/bots";
import type { BotRuntime } from "@/types/bots";

interface BotCardProps {
  runtime: BotRuntime;
  busy?: boolean;
  showOwner?: boolean;
  onStart: () => void;
  onCommand: (command: "pausado" | "rodando" | "parado") => void;
  onEdit: () => void;
  onShowEvents: () => void;
}

const statusClass = {
  running: "bg-success/15 text-success",
  paused: "bg-warning/15 text-warning",
  starting: "bg-primary/15 text-primary",
  stopping: "bg-warning/15 text-warning",
  failed: "bg-destructive/15 text-destructive",
  completed: "bg-success/15 text-success",
  offline: "bg-destructive/15 text-destructive",
  idle: "bg-muted text-muted-foreground",
};

export function BotCard({
  runtime,
  busy,
  showOwner,
  onStart,
  onCommand,
  onEdit,
  onShowEvents,
}: BotCardProps) {
  const { config } = runtime;
  const scraper = runtime.checkpoints.scraper;
  const importer = runtime.checkpoints.importador;
  const state = scraper?.state ?? {};
  const importerState = importer?.state ?? {};
  const status = botVisualStatus(runtime);
  const active = isBotActive(runtime);
  const cityIndex = Number(state.indice_cidade || 0);
  const cityTotal = Number(state.total_cidades || config.cities.length || 0);
  const companiesFound = Number(
    state.total_itens || state.ultima_cidade_total_empresas || 0,
  );
  const progress = cityTotal ? Math.round((cityIndex / cityTotal) * 100) : 0;

  return (
    <Card className="p-5 space-y-5 hover:shadow-lift transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-bold truncate">{config.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {config.niche} · {config.cities.length} cidade(s)
          </p>
          {showOwner && (
            <p className="text-xs text-muted-foreground mt-1">
              Responsável: {config.owner_email}
            </p>
          )}
        </div>
        <Badge className={`border-0 shrink-0 ${statusClass[status]}`}>
          <Activity className="w-3 h-3 mr-1" />
          {botStatusLabel(status)}
        </Badge>
      </div>

      <div>
        <div className="flex justify-between text-xs mb-2">
          <span className="text-muted-foreground">Progresso das cidades</span>
          <span className="font-semibold">
            {cityIndex} de {cityTotal}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> Cidade atual
          </p>
          <p className="font-medium mt-1 truncate">
            {state.cidade_atual || state.ultima_cidade || "—"}
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Empresas encontradas
          </p>
          <p className="font-medium mt-1">{companiesFound}</p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">Atividade: </span>
          {state.atividade_atual || "Aguardando execução"}
        </p>
        <p>
          <span className="text-muted-foreground">Resumo da cidade: </span>
          {companiesFound} empresa(s) encontrada(s)
        </p>
        <p>
          <span className="text-muted-foreground">Importador: </span>
          {importerState.atividade_atual || importer?.status || "Aguardando"}
        </p>
        <p className="text-xs text-muted-foreground">
          Executor: {state.executor?.id || runtime.runner?.name || "—"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
        <Button size="sm" onClick={onStart} disabled={active || busy}>
          <Play className="w-3.5 h-3.5 mr-1" /> Iniciar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCommand("pausado")}
          disabled={!["running", "starting"].includes(status) || busy}
        >
          <Pause className="w-3.5 h-3.5 mr-1" /> Pausar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCommand("rodando")}
          disabled={status !== "paused" || busy}
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Continuar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCommand("parado")}
          disabled={!active || status === "stopping" || busy}
        >
          <Square className="w-3.5 h-3.5 mr-1" /> Parar
        </Button>
        <Button size="sm" variant="ghost" onClick={onEdit} disabled={active}>
          <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
        </Button>
        <Button size="sm" variant="ghost" onClick={onShowEvents}>
          <History className="w-3.5 h-3.5 mr-1" /> Eventos
        </Button>
      </div>
    </Card>
  );
}
