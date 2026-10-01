import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteMessageBot,
  listLeadStages,
  listMessageBotRuntimes,
  listOwnerNiches,
  listWhatsAppSessions,
  requestMessageBotCommand,
  saveMessageBot,
} from "@/services/messageBots";
import type {
  MessageBotCommand,
  MessageBotConfig,
  MessageBotFormData,
} from "@/types/messageBots";

export function useMessageBots() {
  return useQuery({
    queryKey: ["message-bots", "runtime"],
    queryFn: listMessageBotRuntimes,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

export function useWhatsAppSessions() {
  return useQuery({
    queryKey: ["message-bots", "sessions"],
    queryFn: listWhatsAppSessions,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

export function useMessageBotOptions(ownerId?: string) {
  const stages = useQuery({
    queryKey: ["message-bots", "stages"],
    queryFn: listLeadStages,
    staleTime: 60_000,
  });
  const niches = useQuery({
    queryKey: ["message-bots", "niches", ownerId],
    queryFn: () => listOwnerNiches(ownerId!),
    enabled: Boolean(ownerId),
    staleTime: 30_000,
  });
  return { stages, niches };
}

export function useMessageBotActions() {
  const client = useQueryClient();
  const invalidate = () =>
    client.invalidateQueries({ queryKey: ["message-bots"] });

  const command = useMutation({
    mutationFn: (input: {
      botId: string;
      command: MessageBotCommand;
      runnerId?: string | null;
    }) =>
      requestMessageBotCommand(
        input.botId,
        input.command,
        input.runnerId,
      ),
    onSuccess: invalidate,
  });
  const save = useMutation({
    mutationFn: (input: {
      form: MessageBotFormData;
      createdBy: string;
      current?: MessageBotConfig;
    }) => saveMessageBot(input.form, input.createdBy, input.current),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: deleteMessageBot,
    onSuccess: invalidate,
  });
  return { command, save, remove };
}
