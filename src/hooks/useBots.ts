import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteBotConfig,
  listBotEvents,
  listBotRuntimes,
  listOnlineRunners,
  requestBotCommand,
  saveBotConfig,
} from "@/services/bots";
import type { BotConfig, BotFormData } from "@/types/bots";

export function useBots() {
  return useQuery({
    queryKey: ["bots", "runtime"],
    queryFn: listBotRuntimes,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

export function useBotEvents(botId?: string) {
  return useQuery({
    queryKey: ["bots", botId, "events"],
    queryFn: () => listBotEvents(botId!, 50),
    enabled: Boolean(botId),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

export function useOnlineRunners() {
  return useQuery({
    queryKey: ["bots", "runners"],
    queryFn: listOnlineRunners,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

export function useBotActions() {
  const client = useQueryClient();
  const invalidate = () =>
    client.invalidateQueries({ queryKey: ["bots"] });

  const command = useMutation({
    mutationFn: (input: {
      botId: string;
      command: "rodando" | "pausado" | "parado";
      runnerId?: string | null;
    }) => requestBotCommand(input.botId, input.command, input.runnerId),
    onSuccess: invalidate,
  });

  const save = useMutation({
    mutationFn: (input: { form: BotFormData; current?: BotConfig }) =>
      saveBotConfig(input.form, input.current),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: deleteBotConfig,
    onSuccess: invalidate,
  });

  return { command, save, remove };
}
