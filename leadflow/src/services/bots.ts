import { supabase } from "@/integrations/supabase/client";
import type {
  BotConfig,
  BotEvent,
  BotFormData,
  BotRunner,
  BotRuntime,
} from "@/types/bots";

// As tabelas dos bots ainda não fazem parte do arquivo de tipos legado.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function listBotRuntimes(): Promise<BotRuntime[]> {
  const { data, error } = await db.rpc("prospecta_list_bot_runtimes");
  if (error) throw error;
  return (data ?? []).map(
    (row: { runtime: BotRuntime }) => row.runtime,
  );
}

export async function listBotEvents(
  botId: string,
  limit = 30,
): Promise<BotEvent[]> {
  const { data, error } = await db.rpc("prospecta_get_bot_events", {
    p_bot_id: botId,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as BotEvent[];
}

export async function listRecentBotEvents(limit = 20): Promise<BotEvent[]> {
  const { data, error } = await db.rpc("prospecta_get_recent_bot_events", {
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as BotEvent[];
}

export async function listOnlineRunners(): Promise<BotRunner[]> {
  const { data, error } = await db.rpc("prospecta_list_runners");
  if (error) throw error;
  return (data ?? []) as BotRunner[];
}

export async function requestBotCommand(
  botId: string,
  command: "rodando" | "pausado" | "parado",
  targetRunnerId?: string | null,
): Promise<void> {
  const { error } = await db.rpc("prospecta_request_command", {
    p_bot_id: botId,
    p_command: command,
    p_target_runner_id: targetRunnerId || null,
  });
  if (error) throw error;
}

export async function saveBotConfig(
  form: BotFormData,
  current?: BotConfig,
): Promise<void> {
  const includedWords = new Map(
    form.included_words.map((item) => [normalizeFilterWord(item), item]),
  );
  const overlappingWord = form.excluded_words.find((item) =>
    includedWords.has(normalizeFilterWord(item)),
  );
  if (overlappingWord) {
    const word = includedWords.get(normalizeFilterWord(overlappingWord));
    throw new Error(
      `A palavra "${word}" não pode estar simultaneamente nos filtros de inclusão e exclusão.`,
    );
  }

  const payload = {
    ...form,
    slug: form.slug || slugify(form.name),
  };
  if (!current) {
    const { error } = await db.from("prospecta_bot_configs").insert(payload);
    if (error) throw error;
    return;
  }

  const { data, error } = await db
    .from("prospecta_bot_configs")
    .update(payload)
    .eq("id", current.id)
    .eq("version", current.version)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error(
      "O bot foi alterado por outro usuário. Atualize a página e tente novamente.",
    );
  }
}

export async function deleteBotConfig(config: BotConfig): Promise<void> {
  const { data, error } = await db.rpc("prospecta_delete_bot", {
    p_bot_id: config.id,
    p_expected_version: config.version,
  });
  if (error) throw error;
  if (!data?.length) throw new Error("O bot já foi alterado ou removido.");
}

function normalizeFilterWord(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
