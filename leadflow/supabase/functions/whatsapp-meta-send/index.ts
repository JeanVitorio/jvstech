import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("LEADFLOW_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function cors(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin)
      ? origin
      : (allowedOrigins[0] ?? ""),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(request), "Content-Type": "application/json" },
  });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Secret obrigatório ausente: ${name}`);
  return value;
}

function base64ToBytes(value: string): Uint8Array {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new Error("Credencial criptografada inválida");
  }
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

async function authorize(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new HttpError("Autorização necessária", 401);
  }
  const url = requiredEnv("SUPABASE_URL");
  const anonKey = requiredEnv("SUPABASE_ANON_KEY");
  const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) {
    throw new HttpError("Sessão inválida ou expirada", 401);
  }
  const admin = createClient(url, serviceKey);
  const { data: authorization, error: authorizationError } = await admin
    .from("prospecta_whatsapp_unofficial_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (authorizationError) throw authorizationError;
  if (!authorization) {
    throw new HttpError(
      "Bots de mensagens não estão disponíveis para este usuário",
      403,
    );
  }
  return {
    user: data.user,
    admin,
  };
}

function parseDeliveryId(value: unknown): number {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    !/^[1-9][0-9]*$/.test(String(value))
  ) {
    throw new HttpError("delivery_id inválido", 400);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new HttpError("delivery_id inválido", 400);
  }
  return parsed;
}

function parseClaimToken(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(value)
  ) {
    throw new HttpError("claim_token inválido", 400);
  }
  return value;
}

function graphErrorCode(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "meta_request_failed";
  const error = (payload as { error?: { code?: unknown; error_subcode?: unknown } }).error;
  const code = typeof error?.code === "number" ? error.code : "unknown";
  const subcode = typeof error?.error_subcode === "number"
    ? `_${error.error_subcode}`
    : "";
  return `meta_${code}${subcode}`.slice(0, 200);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: cors(request) });
  }
  if (request.method !== "POST") {
    return json(request, { error: "Método não permitido" }, 405);
  }

  let deliveryId: number | null = null;
  let claimToken: string | null = null;
  let admin: ReturnType<typeof createClient> | null = null;
  try {
    const context = await authorize(request);
    admin = context.admin;
    const body = await request.json().catch(() => {
      throw new HttpError("JSON inválido", 400);
    }) as Record<string, unknown>;
    deliveryId = parseDeliveryId(body.delivery_id);
    claimToken = parseClaimToken(body.claim_token);

    const { data: delivery, error: deliveryError } = await admin
      .from("prospecta_message_deliveries")
      .select(
        "id, tenant_id, bot_id, lead_id, whatsapp_session_id, phone_normalized, status, claim_token, lease_expires_at",
      )
      .eq("id", deliveryId)
      .eq("claim_token", claimToken)
      .eq("status", "claimed")
      .maybeSingle();
    if (deliveryError) throw deliveryError;
    if (!delivery) throw new HttpError("Entrega reivindicada não encontrada", 404);
    if (new Date(delivery.lease_expires_at).getTime() < Date.now()) {
      throw new HttpError("A reivindicação da entrega expirou", 409);
    }

    const { data: membership, error: membershipError } = await admin
      .from("tenant_memberships")
      .select("tenant_id")
      .eq("tenant_id", delivery.tenant_id)
      .eq("user_id", context.user.id)
      .not("accepted_at", "is", null)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) throw new HttpError("Acesso negado à entrega", 403);

    const [
      { data: bot, error: botError },
      { data: session, error: sessionError },
      { data: credential, error: credentialError },
      { data: lead, error: leadError },
    ] = await Promise.all([
      admin
        .from("prospecta_message_bot_configs")
        .select(
          "id, tenant_id, whatsapp_session_id, niche, meta_template_name, meta_template_language, meta_template_parameters",
        )
        .eq("id", delivery.bot_id)
        .eq("tenant_id", delivery.tenant_id)
        .is("deleted_at", null)
        .maybeSingle(),
      admin
        .from("prospecta_whatsapp_sessions")
        .select("id, tenant_id, provider, status")
        .eq("id", delivery.whatsapp_session_id)
        .eq("tenant_id", delivery.tenant_id)
        .is("deleted_at", null)
        .maybeSingle(),
      admin
        .from("prospecta_whatsapp_cloud_credentials")
        .select(
          "phone_number_id, api_version, token_ciphertext, token_iv, status",
        )
        .eq("tenant_id", delivery.tenant_id)
        .eq("whatsapp_session_id", delivery.whatsapp_session_id)
        .maybeSingle(),
      admin
        .from("leads")
        .select("id, tenant_id, name, company, niche")
        .eq("id", delivery.lead_id)
        .eq("tenant_id", delivery.tenant_id)
        .maybeSingle(),
    ]);
    if (botError || sessionError || credentialError || leadError) {
      throw botError ?? sessionError ?? credentialError ?? leadError;
    }
    if (!bot || !session || !credential || !lead) {
      throw new HttpError("Configuração da entrega Meta incompleta", 409);
    }
    if (
      bot.whatsapp_session_id !== delivery.whatsapp_session_id ||
      session.provider !== "meta_cloud_api" ||
      credential.status !== "active"
    ) {
      throw new HttpError("Sessão Meta não está ativa para esta entrega", 409);
    }
    if (
      typeof bot.meta_template_name !== "string" ||
      !/^[a-z0-9_]{1,512}$/.test(bot.meta_template_name) ||
      typeof bot.meta_template_language !== "string" ||
      !/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(bot.meta_template_language)
    ) {
      throw new HttpError("Template Meta inválido", 409);
    }
    const parameterNames = bot.meta_template_parameters;
    if (
      !Array.isArray(parameterNames) ||
      !parameterNames.every((value) =>
        typeof value === "string" && ["nome", "empresa", "nicho"].includes(value)
      )
    ) {
      throw new HttpError("Parâmetros do template Meta inválidos", 409);
    }

    const values: Record<string, string> = {
      nome: String(lead.name ?? "").trim(),
      empresa: String(lead.company ?? "").trim(),
      nicho: String(lead.niche ?? bot.niche ?? "").trim(),
    };
    const parameters = parameterNames.map((name) => ({
      type: "text",
      text: values[name].slice(0, 1024),
    }));
    const phone = String(delivery.phone_normalized).replace(/[^0-9]/g, "");
    if (!/^[1-9][0-9]{7,14}$/.test(phone)) {
      throw new HttpError("Telefone da entrega inválido", 409);
    }

    const token = await decrypt(
      credential.token_ciphertext,
      credential.token_iv,
    );
    const graphBody: Record<string, unknown> = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phone,
      type: "template",
      template: {
        name: bot.meta_template_name,
        language: { code: bot.meta_template_language },
        ...(parameters.length > 0
          ? { components: [{ type: "body", parameters }] }
          : {}),
      },
    };
    const response = await fetch(
      `https://graph.facebook.com/${credential.api_version}/${credential.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(graphBody),
      },
    );
    const graphPayload = await response.json().catch(() => ({})) as {
      messages?: Array<{ id?: string }>;
      error?: unknown;
    };
    if (!response.ok || !graphPayload.messages?.[0]?.id) {
      const errorCode = graphErrorCode(graphPayload);
      const { error: finalizeError } = await admin.rpc(
        "prospecta_finalize_meta_message_delivery",
        {
          p_delivery_id: deliveryId,
          p_claim_token: claimToken,
          p_status: "failed",
          p_error_code: errorCode,
          p_meta_message_id: null,
          p_meta_delivery_status: "failed",
        },
      );
      if (finalizeError) console.error("Falha ao finalizar erro Meta:", finalizeError);
      throw new HttpError("A Meta recusou o envio do template", 502);
    }

    const messageId = graphPayload.messages[0].id;
    const { data: finalized, error: finalizeError } = await admin.rpc(
      "prospecta_finalize_meta_message_delivery",
      {
        p_delivery_id: deliveryId,
        p_claim_token: claimToken,
        p_status: "sent",
        p_error_code: null,
        p_meta_message_id: messageId,
        p_meta_delivery_status: "accepted",
      },
    );
    if (finalizeError) throw finalizeError;
    if (!finalized) {
      throw new HttpError("A entrega perdeu a reivindicação antes da finalização", 409);
    }

    return json(request, {
      ok: true,
      delivery_id: deliveryId,
      meta_message_id: messageId,
      status: "sent",
    });
  } catch (error) {
    console.error("whatsapp-meta-send:", error);
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError
      ? error.message
      : "Não foi possível enviar a mensagem Meta";
    return json(request, { error: message }, status);
  }
});
