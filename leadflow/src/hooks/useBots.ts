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
import { botVisualStatus } from "@/lib/bots";
import type { BotConfig, BotFormData, BotRuntime } from "@/types/bots";

// Com agente trabalhando os números mudam a todo momento; parado, quase nunca.
// O ritmo lento evita consultas inúteis ao banco com a tela apenas aberta.
const RITMO_ATIVO = 30_000;
const RITMO_PARADO = 120_000;

const temAgenteTrabalhando = (runtimes?: BotRuntime[]) =>
  (runtimes ?? []).some((runtime) =>
    ["running", "starting", "stopping"].includes(botVisualStatus(runtime)),
  );

export function useBots() {
  return useQuery({
    queryKey: ["bots", "runtime"],
    queryFn: listBotRuntimes,
    staleTime: 15_000,
    refetchInterval: (query) =>
      temAgenteTrabalhando(query.state.data) ? RITMO_ATIVO : RITMO_PARADO,
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
export function useLastLeadDelivery(agenteTrabalhando = false) {
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
    refetchInterval: agenteTrabalhando ? RITMO_ATIVO * 2 : RITMO_PARADO * 2,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

export function useBotLeadCounts(agenteTrabalhando = false) {
  return useQuery({
    queryKey: ["bots", "lead-counts"],
    queryFn: listBotLeadCounts,
    staleTime: 15_000,
    refetchInterval: agenteTrabalhando ? RITMO_ATIVO : RITMO_PARADO,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

// A lista de PCs só interessa com a janela de iniciar agente aberta.
export function useOnlineRunners(ativo = true) {
  // Sem cache: ao abrir "Iniciar agente" a lista precisa refletir os PCs de agora.
  return useQuery({
    queryKey: ["bots", "runners"],
    queryFn: listOnlineRunners,
    enabled: ativo,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: ativo ? 20_000 : false,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

export function useAppInstallation() {
  return useQuery({
    queryKey: ["bots", "installation"],
    queryFn: getAppInstallationStatus,
    staleTime: 10_000,
    // Com o app fora do ar o usuário está esperando ele conectar, então a
    // checagem continua rápida. Já conectado, não há o que esperar.
    refetchInterval: (query) => (query.state.data?.online ? 60_000 : 20_000),
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
