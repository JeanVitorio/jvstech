import {
  Clock,
  MessageCircle,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Square,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  MessageBotCommand,
  MessageBotRuntime,
} from "@/types/messageBots";

interface Props {
  item: MessageBotRuntime;
  busy?: boolean;
  onStart: () => void;
  onCommand: (command: MessageBotCommand) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const statusLabels: Record<string, string> = {
  idle: "Inativo",
  starting: "Iniciando",
  waiting_qr: "Aguardando QR Code",
  running: "Executando",
  paused: "Pausado",
  outside_schedule: "Fora da agenda",
  hourly_limit: "Limite por hora",
  no_leads: "Sem leads elegíveis",
  stopped: "Parado",
  failed: "Falhou",
};

export function MessageBotCard({
  item,
  busy,
  onStart,
  onCommand,
  onEdit,
  onDelete,
}: Props) {
  const { config, session, runtime, control } = item;
  const status = runtime?.status ?? "idle";
  const active = Boolean(
    runtime?.heartbeat_at &&
    Date.now() - new Date(runtime.heartbeat_at).getTime() < 120_000 &&
    control?.command !== "parado",
  );

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold">{config.name}</h3>
          <p className="text-sm text-muted-foreground">
            {config.niche} · {config.max_messages_per_hour}/hora
          </p>
        </div>
        <Badge variant="outline">{statusLabels[status] ?? status}</Badge>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Sessão WhatsApp</p>
          <p className="font-medium mt-1">
            {session.name} · {session.status}
          </p>
          {session.connected_number && (
            <p className="text-xs text-muted-foreground">
              +{session.connected_number}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Resultados</p>
          <p className="font-medium mt-1">
            {runtime?.sent_count ?? 0} enviados
          </p>
          <p className="text-xs text-muted-foreground">
            {runtime?.invalid_count ?? 0} inválidos · {runtime?.failed_count ?? 0} falhas
          </p>
        </div>
      </div>

      {session.qr_code_data_url && session.status === "qr_pending" && (
        <div className="rounded-lg border p-4 text-center">
          <p className="text-sm font-medium mb-3">
            Escaneie no WhatsApp para conectar
          </p>
          <img
            src={session.qr_code_data_url}
            alt={`QR Code da sessão ${session.name}`}
            className="w-64 h-64 mx-auto"
          />
        </div>
      )}

      {session.status === "ready" && (
        <div className="rounded-lg border bg-muted/20 p-4 text-center">
          <p className="text-sm font-medium mb-3">WhatsApp conectado</p>
          <img
            src="/LoboOk.png"
            alt="Bot conectado ao WhatsApp"
            className="max-h-64 w-full object-contain mx-auto"
          />
        </div>
      )}

      {session.status !== "ready" && !session.qr_code_data_url && (
        <div className="rounded-lg border bg-muted/20 p-4 text-center">
          <p className="text-sm font-medium mb-3">WhatsApp não conectado</p>
          <img
            src="/loboNoAprove.png"
            alt="Bot não conectado ao WhatsApp"
            className="max-h-64 w-full object-contain mx-auto"
          />
        </div>
      )}

      <div className="space-y-1 text-sm">
        <p className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Intervalo de {formatSeconds(config.min_interval_seconds)} a{" "}
          {formatSeconds(config.max_interval_seconds)}
        </p>
        {runtime?.next_send_at && (
          <p className="text-xs text-muted-foreground">
            Próximo envio: {new Date(runtime.next_send_at).toLocaleString("pt-BR")}
          </p>
        )}
        {runtime?.last_error && (
          <p className="text-xs text-destructive">
            Último erro: {runtime.last_error}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <Button size="sm" onClick={onStart} disabled={active || busy}>
          <Play className="w-3.5 h-3.5 mr-1" /> Iniciar/conectar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCommand("pausado")}
          disabled={!active || control?.command === "pausado" || busy}
        >
          <Pause className="w-3.5 h-3.5 mr-1" /> Pausar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCommand("rodando")}
          disabled={control?.command !== "pausado" || busy}
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Continuar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCommand("parado")}
          disabled={!active || busy}
        >
          <Square className="w-3.5 h-3.5 mr-1" /> Parar
        </Button>
        <Button size="sm" variant="ghost" onClick={onEdit} disabled={active}>
          <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
          disabled={active || busy}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
        </Button>
        <Badge variant="secondary" className="ml-auto">
          <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp Web
        </Badge>
      </div>
    </Card>
  );
}

function formatSeconds(seconds: number): string {
  if (seconds % 86400 === 0) return `${seconds / 86400} dia(s)`;
  if (seconds % 3600 === 0) return `${seconds / 3600} hora(s)`;
  return `${Math.round(seconds / 60)} minuto(s)`;
}
