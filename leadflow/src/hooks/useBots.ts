import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteBotConfig,
  getAppInstallationStatus,
  listBotEvents,
  listBotLeadCounts,
  listBotRuntimes,
  listOnlineRunners,
  listRecentBotEvents,
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

// Última importação de leads registrada por qualquer agente da empresa.
export function useLastLeadDelivery() {
  return useQuery({
    queryKey: ["bots", "ultima-entrega"],
    queryFn: async () => {
      const eventos = await listRecentBotEvents(50);
      const entrega = eventos.find((evento) => {
        if (evento.event_type !== "lote_leads_processado") return false;
        return Number((evento.data as { importados?: number })?.importados || 0) > 0;
      });
      if (!entrega) return null;
      return {
        botId: entrega.bot_id,
        quantidade: Number((entrega.data as { importados?: number }).importados || 0),
        quando: entrega.created_at,
      };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

export function useBotLeadCounts() {
  return useQuery({
    queryKey: ["bots", "lead-counts"],
    queryFn: listBotLeadCounts,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

export function useOnlineRunners() {
  // Sem cache: ao abrir "Iniciar agente" a lista precisa refletir os PCs de agora.
  return useQuery({
    queryKey: ["bots", "runners"],
    queryFn: listOnlineRunners,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

export function useAppInstallation() {
  return useQuery({
    queryKey: ["bots", "installation"],
    queryFn: getAppInstallationStatus,
    staleTime: 10_000,
    refetchInterval: 20_000,
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
