import { createClient } from "npm:@supabase/supabase-js@2";

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Secret obrigatório ausente: ${name}`);
  return value;
}

function response(body: string, status = 200, contentType = "text/plain"): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": contentType },
  });
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function decrypt(ciphertext: string, iv: string): Promise<string> {
  const rawKey = base64ToBytes(requiredEnv("WHATSAPP_CREDENTIALS_KEY"));
  if (rawKey.byteLength !== 32) {
    throw new Error("WHATSAPP_CREDENTIALS_KEY deve conter exatamente 32 bytes");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    rawKey,
    "AES-GCM",
    false,
    ["decrypt"],
  );
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext),
  );
  return new TextDecoder().decode(plain);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function validSignature(
  body: Uint8Array,
  appSecret: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, body);
  return constantTimeEqual(
    bytesToHex(new Uint8Array(digest)),
    signatureHeader.slice(7).toLowerCase(),
  );
}

type WebhookStatus = {
  id?: unknown;
  status?: unknown;
  timestamp?: unknown;
  errors?: Array<{ code?: unknown }>;
};

function collectPayload(payload: unknown): {
  phoneNumberIds: string[];
  statuses: WebhookStatus[];
} {
  const phoneNumberIds = new Set<string>();
  const statuses: WebhookStatus[] = [];
  if (!payload || typeof payload !== "object") {
    return { phoneNumberIds: [], statuses };
  }
  const entries = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) return { phoneNumberIds: [], statuses };
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const changes = (entry as { changes?: unknown }).changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      if (!change || typeof change !== "object") continue;
      const value = (change as { value?: unknown }).value;
      if (!value || typeof value !== "object") continue;
      const metadata = (value as { metadata?: unknown }).metadata;
      if (metadata && typeof metadata === "object") {
        const id = (metadata as { phone_number_id?: unknown }).phone_number_id;
        if (typeof id === "string" && /^[0-9]{5,40}$/.test(id)) {
          phoneNumberIds.add(id);
        }
      }
      const incomingStatuses = (value as { statuses?: unknown }).statuses;
      if (Array.isArray(incomingStatuses)) {
        statuses.push(...incomingStatuses.filter(
          (status): status is WebhookStatus =>
            Boolean(status) && typeof status === "object",
        ));
      }
    }
  }
  return { phoneNumberIds: [...phoneNumberIds], statuses };
}

Deno.serve(async (request) => {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (
      mode === "subscribe" &&
      token === requiredEnv("META_WEBHOOK_VERIFY_TOKEN") &&
      challenge
    ) {
      return response(challenge);
    }
    return response("Forbidden", 403);
  }
  if (request.method !== "POST") return response("Method Not Allowed", 405);

  try {
    const rawBody = new Uint8Array(await request.arrayBuffer());
    const payload = JSON.parse(new TextDecoder().decode(rawBody)) as unknown;
    const { phoneNumberIds, statuses } = collectPayload(payload);
    if (phoneNumberIds.length !== 1) {
      return response("Not Found", 404);
    }

    const admin = createClient(
      requiredEnv("SUPABASE_URL"),
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    );
    const { data: credential, error: credentialError } = await admin
      .from("prospecta_whatsapp_cloud_credentials")
      .select(
        "tenant_id, whatsapp_session_id, app_secret_ciphertext, app_secret_iv, status",
      )
      .eq("phone_number_id", phoneNumberIds[0])
      .eq("status", "active")
      .maybeSingle();
    if (credentialError) throw credentialError;
    if (!credential) return response("Not Found", 404);

    if (!credential.app_secret_ciphertext || !credential.app_secret_iv) {
      return response("Webhook credentials incomplete", 503);
    }
    const appSecret = await decrypt(
      credential.app_secret_ciphertext,
      credential.app_secret_iv,
    );
    if (
      !await validSignature(
        rawBody,
        appSecret,
        request.headers.get("X-Hub-Signature-256"),
      )
    ) {
      return response("Unauthorized", 401);
    }

    const allowedStatuses = new Set(["sent", "delivered", "read", "failed"]);
    for (const item of statuses) {
      const messageId = typeof item.id === "string" ? item.id : "";
      const status = typeof item.status === "string" ? item.status : "";
      if (!messageId || !allowedStatuses.has(status)) continue;
      const epoch = typeof item.timestamp === "string" &&
          /^[0-9]{1,12}$/.test(item.timestamp)
        ? Number(item.timestamp)
        : Math.floor(Date.now() / 1000);
      const updatedAt = new Date(epoch * 1000).toISOString();
      const errorCode = status === "failed" && Array.isArray(item.errors)
        ? `meta_${String(item.errors[0]?.code ?? "failed")}`.slice(0, 200)
        : null;

      const { error: updateError } = await admin.rpc(
        "prospecta_apply_meta_delivery_status",
        {
          p_phone_number_id: phoneNumberIds[0],
          p_meta_message_id: messageId,
          p_meta_delivery_status: status,
          p_status_updated_at: updatedAt,
          p_error_code: errorCode,
        },
      );
      if (updateError) throw updateError;
    }

    return response("EVENT_RECEIVED");
  } catch (error) {
    console.error("whatsapp-meta-webhook:", error);
    return response("Internal Server Error", 500);
  }
});
