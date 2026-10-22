import { useState } from "react";
import { MessageCircle, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { MessageBotCard } from "@/components/message-bots/MessageBotCard";
import { MessageBotFormDialog } from "@/components/message-bots/MessageBotFormDialog";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useOnlineRunners } from "@/hooks/useBots";
import {
  useMessageBotActions,
  useMessageBotOptions,
  useMessageBotPermission,
  useMessageBots,
  useWhatsAppSessions,
} from "@/hooks/useMessageBots";
import { useApp } from "@/store/AppStore";
import type {
  MessageBotCommand,
  MessageBotConfig,
  MessageBotFormData,
  MessageBotRuntime,
} from "@/types/messageBots";

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function MessageBots() {
  const { user } = useAuth();
  const { users } = useApp();
  const bots = useMessageBots();
  const sessions = useWhatsAppSessions();
  const runners = useOnlineRunners();
  const actions = useMessageBotActions();
  const messageBotPermission = useMessageBotPermission();
  const [ownerId, setOwnerId] = useState(user?.id ?? "");
  const options = useMessageBotOptions(ownerId);
  const [editing, setEditing] = useState<MessageBotConfig>();
  const [formOpen, setFormOpen] = useState(false);
  const [starting, setStarting] = useState<MessageBotRuntime | null>(null);
  const [riskBot, setRiskBot] = useState<MessageBotRuntime | null>(null);
  const [runnerId, setRunnerId] = useState("");
  const isLeader = user?.role === "leader";
  const canUseUnofficial = messageBotPermission.data === true;
  const visibleBots = canUseUnofficial ? (bots.data ?? []) : [];
  const selectableUsers = isLeader
    ? users
    : users.filter((item) => item.id === user?.id);
  const availableRunners = starting?.session.runner_id
    ? (runners.data ?? []).filter(
        (runner) => runner.id === starting.session.runner_id,
      )
    : runners.data ?? [];

  async function save(form: MessageBotFormData) {
    if (!user) return;
    try {
      await actions.save.mutateAsync({
        form,
        current: editing,
        createdBy: user.id,
      });
      toast.success(editing ? "Agente atualizado." : "Agente criado.");
      setFormOpen(false);
      setEditing(undefined);
    } catch (error) {
      toast.error(errorMessage(error, "Não foi possível salvar o agente."));
    }
  }

  async function remove(config: MessageBotConfig) {
    if (!confirm(`Excluir o agente "${config.name}"?`)) return;
    try {
      await actions.remove.mutateAsync(config);
      toast.success("Agente excluído.");
      setFormOpen(false);
      setEditing(undefined);
    } catch (error) {
      toast.error(errorMessage(error, "Não foi possível excluir o agente."));
    }
  }

  async function command(
    item: MessageBotRuntime,
    commandValue: MessageBotCommand,
  ) {
    try {
      await actions.command.mutateAsync({
        botId: item.config.id,
        command: commandValue,
        runnerId: item.control?.target_runner_id,
      });
      toast.success("Comando enviado.");
    } catch (error) {
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
      toast.success("Inicialização solicitada. Aguarde o QR Code.");
      setStarting(null);
      setRunnerId("");
    } catch (error) {
      toast.error(errorMessage(error, "Não foi possível iniciar o agente."));
    }
  }

  function requestStart(item: MessageBotRuntime) {
    if (!canUseUnofficial) return;
    setRiskBot(item);
  }

  function continueStart() {
    if (!riskBot) return;
    setRunnerId(riskBot.session.runner_id ?? "");
    setStarting(riskBot);
    setRiskBot(null);
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <PageHeader
        title="Agentes de WhatsApp"
        subtitle="Configure mensagens iniciais com agenda e limites controlados."
        actions={
          <Button onClick={() => { setEditing(undefined); setOwnerId(user?.id ?? ""); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Novo agente
          </Button>
        }
      />
      {bots.isLoading ? (
        <Card className="p-10 text-center text-muted-foreground">Carregando agentes...</Card>
      ) : bots.isError ? (
        <Card className="p-10 text-center text-destructive">
          Não foi possível carregar os agentes. Execute o SQL de instalação.
        </Card>
      ) : !visibleBots.length ? (
        <Card className="p-10 text-center">
          <MessageCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">Nenhum agente de WhatsApp criado.</p>
        </Card>
      ) : (
        <div className="grid xl:grid-cols-2 gap-5">
          {visibleBots.map((item) => (
            <MessageBotCard
              key={item.config.id}
              item={item}
              busy={actions.command.isPending}
              canUseUnofficial={canUseUnofficial}
              onStart={() => requestStart(item)}
              onCommand={(value) => command(item, value)}
              onEdit={() => {
                setEditing(item.config);
                setOwnerId(item.config.lead_owner_id);
                setFormOpen(true);
              }}
              onDelete={() => remove(item.config)}
            />
          ))}
        </div>
      )}

      <MessageBotFormDialog
        open={formOpen}
        current={editing}
        users={selectableUsers}
        sessions={sessions.data ?? []}
        canUseUnofficial={canUseUnofficial}
        stages={options.stages.data ?? []}
        niches={options.niches.data ?? []}
        defaultOwnerId={ownerId || user?.id || ""}
        saving={actions.save.isPending || actions.remove.isPending}
        onOwnerChange={setOwnerId}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(undefined);
        }}
        onSave={save}
        onDelete={editing ? () => remove(editing) : undefined}
      />

      <AlertDialog open={Boolean(riskBot)} onOpenChange={(open) => !open && setRiskBot(null)}>
        <AlertDialogContent className="border-destructive/50">
          <AlertDialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <AlertDialogTitle>Risco de bloqueio do WhatsApp</AlertDialogTitle>
            <AlertDialogDescription>
              Este agente usa o WhatsApp Web. Envios em excesso podem levar o WhatsApp
              a limitar ou bloquear o número. Mantenha intervalos e limites por hora moderados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={continueStart}
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(starting)} onOpenChange={(open) => !open && setStarting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar e conectar agente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Escolha o executor que mantém a sessão local do WhatsApp Web.
          </p>
          <Select value={runnerId} onValueChange={setRunnerId}>
            <SelectTrigger><SelectValue placeholder="Selecione um executor" /></SelectTrigger>
            <SelectContent>
              {availableRunners.map((runner) => (
                <SelectItem key={runner.id} value={runner.id}>
                  {runner.name} · {runner.environment}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStarting(null)}>Cancelar</Button>
            <Button disabled={!runnerId} onClick={start}>Iniciar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
