import { useState } from "react";
import { Bot, Plus } from "lucide-react";
import { toast } from "sonner";
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
import {
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
  const bots = useBots();
  const runners = useOnlineRunners();
  const actions = useBotActions();
  const [editing, setEditing] = useState<BotConfig | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [starting, setStarting] = useState<BotRuntime | null>(null);
  const [runnerId, setRunnerId] = useState("");
  const [eventsBot, setEventsBot] = useState<BotRuntime | null>(null);
  const events = useBotEvents(eventsBot?.config.id);
  const busy = actions.command.isPending;
  const isAdmin = user?.role === "leader";

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
      toast.success("Comando enviado ao bot.");
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Não foi possível enviar o comando."));
    }
  }

  async function start() {
    if (!starting || !runnerId) return;
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
      toast.error(errorMessage(error, "Não foi possível iniciar o bot."));
    }
  }

  async function save(form: BotFormData) {
    try {
      await actions.save.mutateAsync({ form, current: editing });
      toast.success(editing ? "Bot atualizado." : "Bot criado.");
      setFormOpen(false);
      setEditing(undefined);
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Não foi possível salvar o bot."));
    }
  }

  async function remove() {
    if (!editing || !confirm(`Excluir o bot "${editing.name}"?`)) return;
    try {
      await actions.remove.mutateAsync(editing);
      toast.success("Bot excluído.");
      setFormOpen(false);
      setEditing(undefined);
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Não foi possível excluir o bot."));
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <PageHeader
        title="Bots"
        subtitle="Acompanhe e controle suas prospecções em tempo real."
        actions={
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Novo bot
          </Button>
        }
      />

      {bots.isLoading ? (
        <Card className="p-10 text-center text-muted-foreground">
          Carregando bots...
        </Card>
      ) : bots.isError ? (
        <Card className="p-10 text-center text-destructive">
          Não foi possível carregar os bots. Verifique as políticas do Supabase.
        </Card>
      ) : !bots.data?.length ? (
        <Card className="p-10 text-center">
          <Bot className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Nenhum bot disponível.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie o primeiro bot para começar.
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

      <Dialog open={Boolean(starting)} onOpenChange={(open) => !open && setStarting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Iniciar bot</DialogTitle></DialogHeader>
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
              Nenhum executor online. Inicie `python runner_remoto.py` na máquina
              que executará o bot.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStarting(null)}>Cancelar</Button>
            <Button onClick={start} disabled={!runnerId || busy}>Iniciar</Button>
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
