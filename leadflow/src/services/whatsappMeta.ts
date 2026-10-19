import { supabase } from "@/integrations/supabase/client";
import type {
  WhatsAppMetaConfigResponse,
  WhatsAppMetaCredentialInput,
  WhatsAppMetaSaveResponse,
  WhatsAppMetaTestResponse,
} from "@/types/whatsappMeta";

interface FunctionError {
  message?: string;
  context?: Response;
}

async function functionErrorMessage(
  error: FunctionError,
  fallback: string,
): Promise<string> {
  if (error.context) {
    const payload = await error.context
      .clone()
      .json()
      .catch(() => null) as { error?: unknown } | null;
    if (typeof payload?.error === "string") return payload.error;
  }
  return error.message || fallback;
}

async function invokeMetaConfig<T>(
  body: Record<string, unknown>,
  fallback: string,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(
    "whatsapp-meta-config",
    { method: "POST", body },
  );
  if (error) {
    throw new Error(await functionErrorMessage(error, fallback));
  }
  return data as T;
}

export function getWhatsAppMetaConfig(): Promise<WhatsAppMetaConfigResponse> {
  return invokeMetaConfig(
    { action: "get" },
    "Não foi possível consultar a configuração Meta.",
  );
}

export function testWhatsAppMetaConfig(
  input: WhatsAppMetaCredentialInput,
): Promise<WhatsAppMetaTestResponse> {
  return invokeMetaConfig(
    { action: "test", ...input },
    "Não foi possível validar a credencial na Meta.",
  );
}

export function saveWhatsAppMetaConfig(
  input: WhatsAppMetaCredentialInput,
): Promise<WhatsAppMetaSaveResponse> {
  return invokeMetaConfig(
    { action: "save", ...input },
    "Não foi possível salvar a configuração Meta.",
  );
}

export function removeWhatsAppMetaConfig(sessionId: string): Promise<{ ok: true }> {
  return invokeMetaConfig(
    { action: "remove", session_id: sessionId },
    "Não foi possível remover a configuração Meta.",
  );
}

export async function canUseMessageBots(): Promise<boolean> {
  // A permissão é sempre decidida pela RPC segura; qualquer falha nega o acesso.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(
    "prospecta_can_use_message_bots",
  );
  if (error) return false;
  return data === true;
}
