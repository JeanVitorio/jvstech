// @ts-nocheck
// Arquivo autocontido para colar diretamente no painel do Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";

const origins = (Deno.env.get("LEADFLOW_ALLOWED_ORIGINS") ?? "").split(",").map((v) => v.trim()).filter(Boolean);
class HttpError extends Error { constructor(message, status) { super(message); this.status = status; } }
const env = (name) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Secret obrigatório ausente: ${name}`);
  return value;
};
const cors = (req) => {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": origins.includes(origin) ? origin : (origins[0] ?? ""),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
};
const json = (req, body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors(req), "Content-Type": "application/json" },
});
const fromBase64 = (value) => {
  try {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  } catch {
    throw new Error("Credencial criptografada inválida");
  }
};
async function decrypt(ciphertext, iv) {
  const raw = fromBase64(env("WHATSAPP_CREDENTIALS_KEY"));
  if (raw.byteLength !== 32) throw new Error("WHATSAPP_CREDENTIALS_KEY deve conter exatamente 32 bytes");
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, key, fromBase64(ciphertext));
  return new TextDecoder().decode(plain);
}
async function authorize(req) {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) throw new HttpError("Autorização necessária", 401);
  const url = env("SUPABASE_URL");
  const userClient = createClient(url, env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw new HttpError("Sessão inválida ou expirada", 401);
  const admin = createClient(url, env("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: authorization, error: authorizationError } = await admin
    .from("prospecta_whatsapp_unofficial_users").select("user_id")
    .eq("user_id", data.user.id).maybeSingle();
  if (authorizationError) throw authorizationError;
  if (!authorization) {
    throw new HttpError("Bots de mensagens não estão disponíveis para este usuário", 403);
  }
  return { user: data.user, admin };
}
function deliveryId(value) {
  if (!/^[1-9][0-9]*$/.test(String(value))) throw new HttpError("delivery_id inválido", 400);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new HttpError("delivery_id inválido", 400);
  return parsed;
}
function claimToken(value) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError("claim_token inválido", 400);
  }
  return value;
}
function metaError(payload) {
  const error = payload?.error;
  const code = typeof error?.code === "number" ? error.code : "unknown";
  const subcode = typeof error?.error_subcode === "number" ? `_${error.error_subcode}` : "";
  return `meta_${code}${subcode}`.slice(0, 200);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Método não permitido" }, 405);
  try {
    const ctx = await authorize(req);
    const body = await req.json().catch(() => { throw new HttpError("JSON inválido", 400); });
    const id = deliveryId(body.delivery_id);
    const token = claimToken(body.claim_token);
    const { data: delivery, error: deliveryError } = await ctx.admin
      .from("prospecta_message_deliveries")
      .select("id, tenant_id, bot_id, lead_id, whatsapp_session_id, phone_normalized, status, claim_token, lease_expires_at")
      .eq("id", id).eq("claim_token", token).eq("status", "claimed").maybeSingle();
    if (deliveryError) throw deliveryError;
    if (!delivery) throw new HttpError("Entrega reivindicada não encontrada", 404);
    if (new Date(delivery.lease_expires_at).getTime() < Date.now()) {
      throw new HttpError("A reivindicação da entrega expirou", 409);
    }
    const { data: membership, error: membershipError } = await ctx.admin.from("tenant_memberships")
      .select("tenant_id").eq("tenant_id", delivery.tenant_id).eq("user_id", ctx.user.id)
      .not("accepted_at", "is", null).maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) throw new HttpError("Acesso negado à entrega", 403);
    const [
      { data: bot, error: botError },
      { data: session, error: sessionError },
      { data: credential, error: credentialError },
      { data: lead, error: leadError },
    ] = await Promise.all([
      ctx.admin.from("prospecta_message_bot_configs")
        .select("id, tenant_id, whatsapp_session_id, niche, meta_template_name, meta_template_language, meta_template_parameters")
        .eq("id", delivery.bot_id).eq("tenant_id", delivery.tenant_id).is("deleted_at", null).maybeSingle(),
      ctx.admin.from("prospecta_whatsapp_sessions").select("id, tenant_id, provider, status")
        .eq("id", delivery.whatsapp_session_id).eq("tenant_id", delivery.tenant_id).is("deleted_at", null).maybeSingle(),
      ctx.admin.from("prospecta_whatsapp_cloud_credentials")
        .select("phone_number_id, api_version, token_ciphertext, token_iv, status")
        .eq("tenant_id", delivery.tenant_id).eq("whatsapp_session_id", delivery.whatsapp_session_id).maybeSingle(),
      ctx.admin.from("leads").select("id, tenant_id, name, company, niche")
        .eq("id", delivery.lead_id).eq("tenant_id", delivery.tenant_id).maybeSingle(),
    ]);
    if (botError || sessionError || credentialError || leadError) throw botError ?? sessionError ?? credentialError ?? leadError;
    if (!bot || !session || !credential || !lead) throw new HttpError("Configuração da entrega Meta incompleta", 409);
    if (bot.whatsapp_session_id !== delivery.whatsapp_session_id || session.provider !== "meta_cloud_api" || credential.status !== "active") {
      throw new HttpError("Sessão Meta não está ativa para esta entrega", 409);
    }
    if (typeof bot.meta_template_name !== "string" || !/^[a-z0-9_]{1,512}$/.test(bot.meta_template_name) ||
      typeof bot.meta_template_language !== "string" || !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(bot.meta_template_language)) {
      throw new HttpError("Template Meta inválido", 409);
    }
    const names = bot.meta_template_parameters;
    if (!Array.isArray(names) || !names.every((value) => typeof value === "string" && ["nome", "empresa", "nicho"].includes(value))) {
      throw new HttpError("Parâmetros do template Meta inválidos", 409);
    }
    const values = {
      nome: String(lead.name ?? "").trim(),
      empresa: String(lead.company ?? "").trim(),
      nicho: String(lead.niche ?? bot.niche ?? "").trim(),
    };
    const parameters = names.map((name) => ({ type: "text", text: values[name].slice(0, 1024) }));
    const phone = String(delivery.phone_normalized).replace(/[^0-9]/g, "");
    if (!/^[1-9][0-9]{7,14}$/.test(phone)) throw new HttpError("Telefone da entrega inválido", 409);
    const accessToken = await decrypt(credential.token_ciphertext, credential.token_iv);
    const graphBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "template",
      template: {
        name: bot.meta_template_name,
        language: { code: bot.meta_template_language },
        ...(parameters.length ? { components: [{ type: "body", parameters }] } : {}),
      },
    };
    const response = await fetch(`https://graph.facebook.com/${credential.api_version}/${credential.phone_number_id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(graphBody),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.messages?.[0]?.id) {
      const { error } = await ctx.admin.rpc("prospecta_finalize_meta_message_delivery", {
        p_delivery_id: id, p_claim_token: token, p_status: "failed",
        p_error_code: metaError(payload), p_meta_message_id: null, p_meta_delivery_status: "failed",
      });
      if (error) console.error("Falha ao finalizar erro Meta:", error);
      throw new HttpError("A Meta recusou o envio do template", 502);
    }
    const messageId = payload.messages[0].id;
    const { data: finalized, error } = await ctx.admin.rpc("prospecta_finalize_meta_message_delivery", {
      p_delivery_id: id, p_claim_token: token, p_status: "sent", p_error_code: null,
      p_meta_message_id: messageId, p_meta_delivery_status: "accepted",
    });
    if (error) throw error;
    if (!finalized) throw new HttpError("A entrega perdeu a reivindicação antes da finalização", 409);
    return json(req, { ok: true, delivery_id: id, meta_message_id: messageId, status: "sent" });
  } catch (error) {
    console.error("whatsapp-meta-send:", error);
    return json(req, {
      error: error instanceof HttpError ? error.message : "Não foi possível enviar a mensagem Meta",
    }, error instanceof HttpError ? error.status : 500);
  }
});
