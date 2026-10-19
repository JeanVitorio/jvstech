// @ts-nocheck
// Arquivo autocontido para colar diretamente no painel do Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";

const env = (name) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Secret obrigatório ausente: ${name}`);
  return value;
};
const reply = (body, status = 200) => new Response(body, {
  status,
  headers: { "Content-Type": "text/plain" },
});
const fromBase64 = (value) =>
  Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
async function decrypt(ciphertext, iv) {
  const raw = fromBase64(env("WHATSAPP_CREDENTIALS_KEY"));
  if (raw.byteLength !== 32) throw new Error("WHATSAPP_CREDENTIALS_KEY deve conter exatamente 32 bytes");
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, key, fromBase64(ciphertext));
  return new TextDecoder().decode(plain);
}
const hex = (bytes) => Array.from(bytes).map((value) => value.toString(16).padStart(2, "0")).join("");
function equal(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
async function validSignature(body, secret, header) {
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, body);
  return equal(hex(new Uint8Array(digest)), header.slice(7).toLowerCase());
}
function collect(payload) {
  const phoneIds = new Set();
  const statuses = [];
  if (!Array.isArray(payload?.entry)) return { phoneIds: [], statuses };
  for (const entry of payload.entry) {
    if (!Array.isArray(entry?.changes)) continue;
    for (const change of entry.changes) {
      const value = change?.value;
      const phoneId = value?.metadata?.phone_number_id;
      if (typeof phoneId === "string" && /^[0-9]{5,40}$/.test(phoneId)) phoneIds.add(phoneId);
      if (Array.isArray(value?.statuses)) statuses.push(...value.statuses.filter((item) => item && typeof item === "object"));
    }
  }
  return { phoneIds: [...phoneIds], statuses };
}

Deno.serve(async (req) => {
  if (req.method === "GET") {
    const url = new URL(req.url);
    if (
      url.searchParams.get("hub.mode") === "subscribe" &&
      url.searchParams.get("hub.verify_token") === env("META_WEBHOOK_VERIFY_TOKEN") &&
      url.searchParams.get("hub.challenge")
    ) {
      return reply(url.searchParams.get("hub.challenge"));
    }
    return reply("Forbidden", 403);
  }
  if (req.method !== "POST") return reply("Method Not Allowed", 405);
  try {
    const raw = new Uint8Array(await req.arrayBuffer());
    const payload = JSON.parse(new TextDecoder().decode(raw));
    const { phoneIds, statuses } = collect(payload);
    if (phoneIds.length !== 1) return reply("Not Found", 404);
    const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
    const { data: credential, error } = await admin.from("prospecta_whatsapp_cloud_credentials")
      .select("tenant_id, whatsapp_session_id, app_secret_ciphertext, app_secret_iv, status")
      .eq("phone_number_id", phoneIds[0]).eq("status", "active").maybeSingle();
    if (error) throw error;
    if (!credential) return reply("Not Found", 404);
    if (!credential.app_secret_ciphertext || !credential.app_secret_iv) {
      return reply("Webhook credentials incomplete", 503);
    }
    const secret = await decrypt(credential.app_secret_ciphertext, credential.app_secret_iv);
    if (!await validSignature(raw, secret, req.headers.get("X-Hub-Signature-256"))) {
      return reply("Unauthorized", 401);
    }
    const allowed = new Set(["sent", "delivered", "read", "failed"]);
    for (const item of statuses) {
      const messageId = typeof item.id === "string" ? item.id : "";
      const status = typeof item.status === "string" ? item.status : "";
      if (!messageId || !allowed.has(status)) continue;
      const epoch = typeof item.timestamp === "string" && /^[0-9]{1,12}$/.test(item.timestamp)
        ? Number(item.timestamp) : Math.floor(Date.now() / 1000);
      const updatedAt = new Date(epoch * 1000).toISOString();
      const errorCode = status === "failed"
        ? `meta_${String(item.errors?.[0]?.code ?? "failed")}`.slice(0, 200) : null;
      const { error: updateError } = await admin.rpc("prospecta_apply_meta_delivery_status", {
        p_phone_number_id: phoneIds[0], p_meta_message_id: messageId,
        p_meta_delivery_status: status, p_status_updated_at: updatedAt,
        p_error_code: errorCode,
      });
      if (updateError) throw updateError;
    }
    return reply("EVENT_RECEIVED");
  } catch (error) {
    console.error("whatsapp-meta-webhook:", error);
    return reply("Internal Server Error", 500);
  }
});
