import { supabase } from "@/integrations/supabase/client";
import type {
  LeadStageOption,
  MessageBotCommand,
  MessageBotConfig,
  MessageBotFormData,
  MessageBotRuntime,
  WhatsAppSession,
} from "@/types/messageBots";

// As tabelas são instaladas pelo SQL separado dos bots de WhatsApp.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function listMessageBotRuntimes(): Promise<MessageBotRuntime[]> {
  const { data, error } = await db.rpc(
    "prospecta_list_message_bot_runtimes",
  );
  if (error) throw error;
  return (data ?? []).map(
    (row: { runtime: MessageBotRuntime }) => row.runtime,
  );
}

export async function listWhatsAppSessions(): Promise<WhatsAppSession[]> {
  const { data, error } = await db
    .from("prospecta_whatsapp_sessions")
    .select("*")
    .is("deleted_at", null)
    .order("name");
  if (error) throw error;
  return (data ?? []) as WhatsAppSession[];
}

export async function listLeadStages(): Promise<LeadStageOption[]> {
  const { data, error } = await supabase
    .from("lead_stages")
    .select("id,name,position")
    .order("position");
  if (error) throw error;
  return data ?? [];
}

export async function listOwnerNiches(ownerId: string): Promise<string[]> {
  if (!ownerId) return [];
  const { data, error } = await db.rpc(
    "prospecta_list_message_niches",
    { p_owner_id: ownerId },
  );
  if (error) throw error;
  return (data ?? []).map((row: { niche: string }) => row.niche);
}

export async function requestMessageBotCommand(
  botId: string,
  command: MessageBotCommand,
  runnerId?: string | null,
): Promise<void> {
  const { error } = await db.rpc(
    "prospecta_request_message_bot_command",
    {
      p_bot_id: botId,
      p_command: command,
      p_target_runner_id: runnerId || null,
    },
  );
  if (error) throw error;
}

export async function saveMessageBot(
  form: MessageBotFormData,
  createdBy: string,
  current?: MessageBotConfig,
): Promise<void> {
  let sessionId = form.whatsapp_session_id;
  if (sessionId === "new") {
    const sessionName = form.new_session_name?.trim();
    if (!sessionName) throw new Error("Informe o nome da nova sessão.");
    const { data, error } = await db
      .from("prospecta_whatsapp_sessions")
      .insert({ name: sessionName, owner_id: createdBy })
      .select("id")
      .single();
    if (error) throw error;
    sessionId = data.id;
  }

  const payload = {
    slug: form.slug,
    name: form.name,
    created_by: current?.created_by ?? createdBy,
    lead_owner_id: form.lead_owner_id,
    whatsapp_session_id: sessionId,
    niche: form.niche,
    source_stage_id: form.source_stage_id,
    target_stage_id: form.target_stage_id,
    message_template: form.message_template,
    min_interval_seconds: form.min_interval_seconds,
    max_interval_seconds: form.max_interval_seconds,
    max_messages_per_hour: form.max_messages_per_hour,
    weekly_schedule: form.weekly_schedule,
    timezone: "America/Sao_Paulo",
  };
  if (!current) {
    const { error } = await db
      .from("prospecta_message_bot_configs")
      .insert(payload);
    if (error) throw error;
    return;
  }
  const { data, error } = await db
    .from("prospecta_message_bot_configs")
    .update(payload)
    .eq("id", current.id)
    .eq("version", current.version)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error(
      "O bot foi alterado por outro usuário. Atualize e tente novamente.",
    );
  }
}

export async function deleteMessageBot(
  config: MessageBotConfig,
): Promise<void> {
  const { data, error } = await db
    .from("prospecta_message_bot_configs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", config.id)
    .eq("version", config.version)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("O bot já foi alterado ou removido.");
}
