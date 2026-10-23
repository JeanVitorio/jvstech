import { useState } from "react";
import { ArrowRight, Bot, Download, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AppRequiredDialog } from "@/components/bots/AppRequiredDialog";
import { BotCard } from "@/components/bots/BotCard";
import { BotFormDialog } from "@/components/bots/BotFormDialog";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { useAuth } from "@/context/AuthContext";
import { useBilling } from "@/context/BillingContext";
import {
  useAppInstallation,
  useBotActions,
  useBotEvents,
  useBots,
  useOnlineRunners,
} from "@/hooks/useBots";
import type { BotConfig, BotFormData, BotRuntime } from "@/types/bots";

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function Bots() {
  const { user } = useAuth();
  const { status: billing } = useBilling();
  const bots = useBots();
  const runners = useOnlineRunners();
  const installation = useAppInstallation();
  const actions = useBotActions();
  const [editing, setEditing] = useState<BotConfig | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [appRequiredOpen, setAppRequiredOpen] = useState(false);
  // Em caso de falha na consulta, não bloqueia: o início do agente já exige executor online.
  const appMissing = installation.data?.installed === false;
  const [starting, setStarting] = useState<BotRuntime | null>(null);
  const [runnerId, setRunnerId] = useState("");
  const [eventsBot, setEventsBot] = useState<BotRuntime | null>(null);
  const events = useBotEvents(eventsBot?.config.id);
  const busy = actions.command.isPending;
  const isAdmin = user?.role === "leader";
  const canGenerate = Boolean(
    billing &&
      ["active", "trialing"].includes(billing.status) &&
      (billing.is_unlimited || billing.leads_remaining > 0),
  );

  async function command(
    runtime: BotRuntime,
    value: "pausado" | "rodando" | "parado",
  ) {
    try {
      await actions.command.mutateAsync({
        botId: runtime.config.id,
        command: value,
        runnerId: runtime.control?.target_runner_id,
      });
      toast.success("Comando enviado ao agente.");
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Não foi possível enviar o comando."));
    }
  }

  async function start() {
    if (!starting || !runnerId) return;
    if (!canGenerate) {
      toast.error(
        "Limite mensal atingido ou assinatura inativa. Faça upgrade para continuar.",
      );
      return;
    }
    try {
      await actions.command.mutateAsync({
        botId: starting.config.id,
        command: "rodando",
        runnerId,
      });
      toast.success("Inicialização solicitada.");
      setStarting(null);
      setRunnerId("");
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Não foi possível iniciar o agente."));
    }
  }

  async function save(form: BotFormData) {
    try {
      await actions.save.mutateAsync({ form, current: editing });
      toast.success(editing ? "Agente atualizado." : "Agente criado.");
      setFormOpen(false);
      setEditing(undefined);
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Não foi possível salvar o agente."));
    }
  }

  async function remove() {
    if (!editing || !confirm(`Excluir o agente "${editing.name}"?`)) return;
    try {
      await actions.remove.mutateAsync(editing);
      toast.success("Agente excluído.");
      setFormOpen(false);
      setEditing(undefined);
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Não foi possível excluir o agente."));
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <PageHeader
        title="Agentes de Prospecção"
        subtitle="Acompanhe e controle suas prospecções em tempo real. Só são salvos leads cujo número abre conversa no WhatsApp."
        actions={
          <Button
            disabled={installation.isLoading}
            onClick={() => {
              if (appMissing) {
                setAppRequiredOpen(true);
                return;
              }
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Novo agente
          </Button>
        }
      />

      {billing && !canGenerate && (
        <Card className="p-4 mb-5 border-warning/40 bg-warning/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm">
            Seu plano não possui saldo disponível para uma nova geração.
          </p>
          <Button asChild size="sm">
            <Link to="/billing">Ver planos e fazer upgrade</Link>
          </Button>
        </Card>
      )}

      {bots.isLoading ? (
        <Card className="p-10 text-center text-muted-foreground">
          Carregando agentes...
        </Card>
      ) : bots.isError ? (
        <Card className="p-10 text-center text-destructive">
          Não foi possível carregar os agentes. Verifique as políticas do Supabase.
        </Card>
      ) : !bots.data?.length && appMissing ? (
        <Card className="relative overflow-hidden p-8 text-center sm:p-12">
          <div className="pointer-events-none absolute inset-0 gradient-glow opacity-60" />
          <span className="relative mx-auto grid h-16 w-16 place-items-center rounded-[1.35rem] gradient-primary text-primary-foreground shadow-glow">
            <Download className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="relative mt-5 font-display text-2xl font-bold">
            Instale o app para criar seus agentes
          </h2>
          <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Os agentes de prospecção trabalham no app LeadFlow para Windows. Instale no seu PC,
            entre com a mesma conta e volte aqui para criar o primeiro agente.
          </p>
          <Button asChild className="relative mt-6 h-11 gap-2 rounded-2xl px-6 font-semibold shadow-glow">
            <Link to="/installation">
              Ver como instalar
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>
      ) : !bots.data?.length ? (
        <Card className="p-10 text-center">
          <Bot className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Nenhum agente disponível.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie o primeiro agente para começar.
          </p>
        </Card>
      ) : (
        <div className="grid xl:grid-cols-2 gap-5">
          {bots.data.map((runtime) => (
            <BotCard
              key={runtime.config.id}
              runtime={runtime}
              busy={busy}
              showOwner={isAdmin}
              onStart={() => setStarting(runtime)}
              onCommand={(value) => command(runtime, value)}
              onEdit={() => {
                setEditing(runtime.config);
                setFormOpen(true);
              }}
              onShowEvents={() => setEventsBot(runtime)}
            />
          ))}
        </div>
      )}

      <BotFormDialog
        open={formOpen}
        current={editing}
        saving={actions.save.isPending || actions.remove.isPending}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(undefined);
        }}
        onSave={save}
        onDelete={editing ? remove : undefined}
      />

      <AppRequiredDialog open={appRequiredOpen} onOpenChange={setAppRequiredOpen} />

      <Dialog open={Boolean(starting)} onOpenChange={(open) => !open && setStarting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Iniciar agente</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Escolha o executor que realizará a prospecção.
          </p>
          <Select value={runnerId} onValueChange={setRunnerId}>
            <SelectTrigger><SelectValue placeholder="Selecione um executor online" /></SelectTrigger>
            <SelectContent>
              {(runners.data ?? []).map((runner) => (
                <SelectItem key={runner.id} value={runner.id}>
                  {runner.name} · {runner.environment}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setStarting(null)}>Cancelar</Button>
            <Button
              onClick={start}
              disabled={!runnerId || busy || !canGenerate}
            >
              Iniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(eventsBot)} onOpenChange={(open) => !open && setEventsBot(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Eventos — {eventsBot?.config.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {events.isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
            {(events.data ?? []).map((event) => (
              <div key={event.event_id} className="rounded-lg border border-border p-3">
                <div className="flex justify-between gap-3">
                  <p className="text-sm font-medium">{event.message}</p>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(event.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {event.process_name} · {event.event_type}
                </p>
              </div>
            ))}
            {!events.isLoading && !events.data?.length && (
              <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
