import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  canUseMessageBots,
  getWhatsAppMetaConfig,
  removeWhatsAppMetaConfig,
  saveWhatsAppMetaConfig,
  testWhatsAppMetaConfig,
} from "@/services/whatsappMeta";

const configKey = ["whatsapp-meta", "config"] as const;

export function useWhatsAppMetaConfig() {
  return useQuery({
    queryKey: configKey,
    queryFn: getWhatsAppMetaConfig,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useMessageBotPermission() {
  return useQuery({
    queryKey: ["whatsapp", "message-bot-permission"],
    queryFn: canUseMessageBots,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useWhatsAppMetaActions() {
  const client = useQueryClient();
  const invalidate = () => {
    void client.invalidateQueries({ queryKey: configKey });
    void client.invalidateQueries({ queryKey: ["message-bots"] });
  };

  const test = useMutation({ mutationFn: testWhatsAppMetaConfig });
  const save = useMutation({
    mutationFn: saveWhatsAppMetaConfig,
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: removeWhatsAppMetaConfig,
    onSuccess: invalidate,
  });

  return { test, save, remove };
}
