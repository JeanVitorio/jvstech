import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  disconnectWhatsappValidation,
  listWhatsappRunnerSessions,
  requestWhatsappValidation,
} from "@/services/whatsappValidation";

const QUERY_KEY = ["whatsapp-validation"];

export function useWhatsappRunnerSessions() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: listWhatsappRunnerSessions,
    staleTime: 2_000,
    // O QR Code muda a cada ~20s: atualiza rápido enquanto aguarda a leitura.
    refetchInterval: (query) =>
      query.state.data?.some((session) =>
        ["connecting", "qr_pending"].includes(session.status),
      )
        ? 3_000
        : 20_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

export function useWhatsappValidationActions() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: QUERY_KEY });

  const connect = useMutation({
    mutationFn: requestWhatsappValidation,
    onSuccess: invalidate,
  });
  const disconnect = useMutation({
    mutationFn: disconnectWhatsappValidation,
    onSuccess: invalidate,
  });

  return { connect, disconnect };
}
