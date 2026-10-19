// @ts-nocheck
// Arquivo autocontido para colar diretamente no painel do Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";

const API_VERSION = "v26.0";
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
    throw new Error("WHATSAPP_CREDENTIALS_KEY deve estar em base64");
  }
};
const toBase64 = (bytes) => {
  let binary = "";
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary);
};
async function encrypt(value) {
  const raw = fromBase64(env("WHATSAPP_CREDENTIALS_KEY"));
  if (raw.byteLength !== 32) throw new Error("WHATSAPP_CREDENTIALS_KEY deve conter exatamente 32 bytes");
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value));
  return { ciphertext: toBase64(new Uint8Array(encrypted)), iv: toBase64(iv) };
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
  const [{ data: profile }, { data: memberships, error: membershipError }] = await Promise.all([
    admin.from("profiles").select("active_tenant_id").eq("id", data.user.id).maybeSingle(),
    admin.from("tenant_memberships").select("tenant_id, role").eq("user_id", data.user.id)
      .not("accepted_at", "is", null).order("created_at"),
  ]);
  if (membershipError) throw membershipError;
  const membership = memberships?.find((item) => item.tenant_id === profile?.active_tenant_id) ?? memberships?.[0];
  if (!membership) throw new HttpError("Empresa não vinculada ao usuário", 403);
  return { admin, user: data.user, tenantId: membership.tenant_id, role: membership.role };
}
function text(value, field, max) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new HttpError(`${field} inválido`, 400);
  }
  return value.trim();
}
function numericId(value, field) {
  const result = text(value, field, 40);
  if (!/^[0-9]{5,40}$/.test(result)) throw new HttpError(`${field} inválido`, 400);
  return result;
}
async function graph(url, token) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    const code = payload.error?.code ? ` (${payload.error.code})` : "";
    throw new HttpError(`Credencial Meta rejeitada${code}`, 400);
  }
  return payload;
}
async function verify(wabaId, phoneId, token) {
  const fields = "id,display_phone_number,verified_name,quality_rating,code_verification_status";
  const phone = await graph(`https://graph.facebook.com/${API_VERSION}/${phoneId}?fields=${fields}`, token);
  if (String(phone.id ?? "") !== phoneId) throw new HttpError("Phone Number ID não foi confirmado pela Meta", 400);
  const numbers = await graph(`https://graph.facebook.com/${API_VERSION}/${wabaId}/phone_numbers?fields=id&limit=100`, token);
  if (!Array.isArray(numbers.data) || !numbers.data.some((item) => String(item?.id ?? "") === phoneId)) {
    throw new HttpError("O número informado não pertence ao WABA", 400);
  }
  return phone;
}
function sanitized(session, credential) {
  return {
    session_id: session.id,
    session_name: session.name,
    provider: session.provider,
    session_status: session.status,
    configured: Boolean(credential),
    credential_status: credential?.status ?? null,
    waba_id: credential?.waba_id ?? null,
    phone_number_id: credential?.phone_number_id ?? null,
    display_phone_number: credential?.display_phone_number ?? null,
    verified_name: credential?.verified_name ?? null,
    quality_rating: credential?.quality_rating ?? null,
    code_verification_status: credential?.code_verification_status ?? null,
    api_version: credential?.api_version ?? API_VERSION,
    last_verified_at: credential?.last_verified_at ?? null,
    last_error: credential?.last_error ?? null,
    has_app_secret: Boolean(credential?.app_secret_ciphertext),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Método não permitido" }, 405);
  try {
    const ctx = await authorize(req);
    const body = await req.json().catch(() => { throw new HttpError("JSON inválido", 400); });
    const action = text(body.action, "Ação", 20).toLowerCase();
    if (!["get", "save", "test", "remove"].includes(action)) throw new HttpError("Ação inválida", 400);
    if (action === "get") {
      const { data: sessions, error } = await ctx.admin.from("prospecta_whatsapp_sessions")
        .select("id, name, provider, status").eq("tenant_id", ctx.tenantId)
        .eq("provider", "meta_cloud_api").is("deleted_at", null).order("created_at");
      if (error) throw error;
      const { data: credentials, error: credentialError } = await ctx.admin
        .from("prospecta_whatsapp_cloud_credentials")
        .select("whatsapp_session_id, waba_id, phone_number_id, display_phone_number, verified_name, quality_rating, code_verification_status, api_version, status, last_verified_at, last_error, app_secret_ciphertext")
        .eq("tenant_id", ctx.tenantId);
      if (credentialError) throw credentialError;
      const bySession = new Map((credentials ?? []).map((item) => [item.whatsapp_session_id, item]));
      return json(req, { sessions: (sessions ?? []).map((session) => sanitized(session, bySession.get(session.id))) });
    }
    if (!["owner", "admin"].includes(ctx.role)) {
      throw new HttpError("Apenas proprietário ou administrador pode alterar a integração", 403);
    }
    if (action === "remove") {
      const sessionId = text(body.session_id, "Sessão", 36);
      const { data: session } = await ctx.admin.from("prospecta_whatsapp_sessions").select("id")
        .eq("id", sessionId).eq("tenant_id", ctx.tenantId).eq("provider", "meta_cloud_api")
        .is("deleted_at", null).maybeSingle();
      if (!session) throw new HttpError("Sessão Meta não encontrada", 404);
      const { error } = await ctx.admin.from("prospecta_whatsapp_cloud_credentials").delete()
        .eq("tenant_id", ctx.tenantId).eq("whatsapp_session_id", sessionId);
      if (error) throw error;
      const { error: sessionError } = await ctx.admin.from("prospecta_whatsapp_sessions")
        .update({ status: "disconnected", connected_number: null, last_error: null, last_seen_at: new Date().toISOString() })
        .eq("id", sessionId).eq("tenant_id", ctx.tenantId);
      if (sessionError) throw sessionError;
      return json(req, { ok: true });
    }
    const wabaId = numericId(body.waba_id, "WABA ID");
    const phoneId = numericId(body.phone_number_id, "Phone Number ID");
    const token = text(body.token, "Token", 4096);
    if (token.length < 20) throw new HttpError("Token inválido", 400);
    const appSecret = text(body.app_secret, "App Secret", 500);
    if (appSecret.length < 16) throw new HttpError("App Secret inválido", 400);
    const phone = await verify(wabaId, phoneId, token);
    if (action === "test") {
      return json(req, { ok: true, phone: {
        id: phone.id,
        display_phone_number: phone.display_phone_number ?? null,
        verified_name: phone.verified_name ?? null,
        quality_rating: phone.quality_rating ?? null,
        code_verification_status: phone.code_verification_status ?? null,
      } });
    }
    const name = text(body.session_name, "Nome da sessão", 120);
    let sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
    if (sessionId) {
      const { data: existing } = await ctx.admin.from("prospecta_whatsapp_sessions").select("id")
        .eq("id", sessionId).eq("tenant_id", ctx.tenantId).eq("provider", "meta_cloud_api")
        .is("deleted_at", null).maybeSingle();
      if (!existing) throw new HttpError("Sessão Meta não encontrada", 404);
      const { error } = await ctx.admin.from("prospecta_whatsapp_sessions").update({
        name, status: "ready", connected_number: phone.display_phone_number ?? null,
        last_error: null, last_seen_at: new Date().toISOString(),
      }).eq("id", sessionId).eq("tenant_id", ctx.tenantId);
      if (error) throw error;
    } else {
      const { data: created, error } = await ctx.admin.from("prospecta_whatsapp_sessions").insert({
        tenant_id: ctx.tenantId, name, owner_id: ctx.user.id, provider: "meta_cloud_api",
        status: "ready", connected_number: phone.display_phone_number ?? null,
        last_seen_at: new Date().toISOString(),
      }).select("id").single();
      if (error || !created) throw error ?? new Error("Falha ao criar sessão");
      sessionId = created.id;
    }
    const encryptedToken = await encrypt(token);
    const encryptedAppSecret = await encrypt(appSecret);
    const { error } = await ctx.admin.from("prospecta_whatsapp_cloud_credentials").upsert({
      tenant_id: ctx.tenantId, whatsapp_session_id: sessionId, waba_id: wabaId,
      phone_number_id: phoneId, display_phone_number: phone.display_phone_number ?? null,
      verified_name: phone.verified_name ?? null, quality_rating: phone.quality_rating ?? null,
      code_verification_status: phone.code_verification_status ?? null, api_version: API_VERSION,
      token_ciphertext: encryptedToken.ciphertext, token_iv: encryptedToken.iv,
      app_secret_ciphertext: encryptedAppSecret.ciphertext,
      app_secret_iv: encryptedAppSecret.iv, status: "active",
      last_verified_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,whatsapp_session_id" });
    if (error) throw error;
    return json(req, {
      ok: true, session_id: sessionId, status: "active",
      display_phone_number: phone.display_phone_number ?? null,
      verified_name: phone.verified_name ?? null, api_version: API_VERSION,
    });
  } catch (error) {
    console.error("whatsapp-meta-config:", error);
    return json(req, {
      error: error instanceof HttpError ? error.message : "Não foi possível processar a configuração Meta",
    }, error instanceof HttpError ? error.status : 500);
  }
});
