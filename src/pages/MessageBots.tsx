import { useState } from "react";
import { MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { MessageBotCard } from "@/components/message-bots/MessageBotCard";
import { MessageBotFormDialog } from "@/components/message-bots/MessageBotFormDialog";
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
import { useOnlineRunners } from "@/hooks/useBots";
import {
  useMessageBotActions,
  useMessageBotOptions,
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
  const [ownerId, setOwnerId] = useState(user?.id ?? "");
  const options = useMessageBotOptions(ownerId);
  const [editing, setEditing] = useState<MessageBotConfig>();
  const [formOpen, setFormOpen] = useState(false);
  const [starting, setStarting] = useState<MessageBotRuntime | null>(null);
  const [runnerId, setRunnerId] = useState("");
  const isLeader = user?.role === "leader";
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
      toast.success(editing ? "Bot atualizado." : "Bot criado.");
      setFormOpen(false);
      setEditing(undefined);
    } catch (error) {
      toast.error(errorMessage(error, "Não foi possível salvar o bot."));
    }
  }

  async function remove(config: MessageBotConfig) {
    if (!confirm(`Excluir o bot "${config.name}"?`)) return;
    try {
      await actions.remove.mutateAsync(config);
      toast.success("Bot excluído.");
      setFormOpen(false);
      setEditing(undefined);
    } catch (error) {
      toast.error(errorMessage(error, "Não foi possível excluir o bot."));
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
      toast.error(errorMessage(error, "Não foi possível iniciar o bot."));
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <PageHeader
        title="Bots de WhatsApp"
        subtitle="Configure mensagens iniciais com agenda e limites controlados."
        actions={
          <Button onClick={() => { setEditing(undefined); setOwnerId(user?.id ?? ""); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Novo bot
          </Button>
        }
      />
      {bots.isLoading ? (
        <Card className="p-10 text-center text-muted-foreground">Carregando bots...</Card>
      ) : bots.isError ? (
        <Card className="p-10 text-center text-destructive">
          Não foi possível carregar os bots. Execute o SQL de instalação.
        </Card>
      ) : !bots.data?.length ? (
        <Card className="p-10 text-center">
          <MessageCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">Nenhum bot de mensagens criado.</p>
        </Card>
      ) : (
        <div className="grid xl:grid-cols-2 gap-5">
          {bots.data.map((item) => (
            <MessageBotCard
              key={item.config.id}
              item={item}
              busy={actions.command.isPending}
              onStart={() => {
                setRunnerId(item.session.runner_id ?? "");
                setStarting(item);
              }}
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

      <Dialog open={Boolean(starting)} onOpenChange={(open) => !open && setStarting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Iniciar e conectar bot</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Escolha o runner que mantém a sessão do WhatsApp.
          </p>
          <Select value={runnerId} onValueChange={setRunnerId}>
            <SelectTrigger><SelectValue placeholder="Selecione um runner" /></SelectTrigger>
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
