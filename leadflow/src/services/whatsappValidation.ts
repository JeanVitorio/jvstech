import { supabase } from "@/integrations/supabase/client";
import type { WhatsappRunnerSession } from "@/types/bots";

// As tabelas de WhatsApp ainda não fazem parte do arquivo de tipos legado.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function listWhatsappRunnerSessions(): Promise<WhatsappRunnerSession[]> {
  const { data, error } = await db
    .from("prospecta_whatsapp_sessions")
    .select("id, runner_id, purpose, status, connected_number, qr_code_data_url, last_error")
    .is("deleted_at", null);
  if (error) throw error;
  return (data ?? []) as WhatsappRunnerSession[];
}

export async function requestWhatsappValidation(runnerId: string): Promise<string> {
  const { data, error } = await db.rpc("prospecta_request_whatsapp_validation", {
    p_runner_id: runnerId,
  });
  if (error) throw error;
  return data as string;
}

export async function disconnectWhatsappValidation(sessionId: string): Promise<void> {
  const { error } = await db.rpc("prospecta_disconnect_whatsapp_validation", {
    p_session_id: sessionId,
  });
  if (error) throw error;
}

// Sessão que o app usará neste PC: a de validação tem prioridade.
export function runnerWhatsappSession(
  sessions: WhatsappRunnerSession[] | undefined,
  runnerId: string,
): WhatsappRunnerSession | undefined {
  const ofRunner = (sessions ?? []).filter((session) => session.runner_id === runnerId);
  return (
    ofRunner.find((session) => session.purpose === "validation") ??
    ofRunner.find((session) => session.status === "ready")
  );
}
