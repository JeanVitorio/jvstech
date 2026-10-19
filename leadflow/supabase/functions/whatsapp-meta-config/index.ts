import { createClient } from "npm:@supabase/supabase-js@2";

const API_VERSION = "v26.0";
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

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new Error("WHATSAPP_CREDENTIALS_KEY deve estar em base64");
  }
}

async function encryptionKey(): Promise<CryptoKey> {
  const raw = base64ToBytes(requiredEnv("WHATSAPP_CREDENTIALS_KEY"));
  if (raw.byteLength !== 32) {
    throw new Error("WHATSAPP_CREDENTIALS_KEY deve conter exatamente 32 bytes");
  }
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
}

async function encrypt(value: string): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    new TextEncoder().encode(value),
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
  };
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
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    throw new HttpError("Sessão inválida ou expirada", 401);
  }
  const admin = createClient(url, serviceKey);
  const { data: authorization, error: authorizationError } = await admin
    .from("prospecta_whatsapp_unofficial_users")
    .select("user_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (authorizationError) throw authorizationError;
  if (!authorization) {
    throw new HttpError(
      "Bots de mensagens não estão disponíveis para este usuário",
      403,
    );
  }
  const [{ data: profile }, { data: memberships, error: membershipError }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("active_tenant_id")
        .eq("id", authData.user.id)
        .maybeSingle(),
      admin
        .from("tenant_memberships")
        .select("tenant_id, role")
        .eq("user_id", authData.user.id)
        .not("accepted_at", "is", null)
        .order("created_at", { ascending: true }),
    ]);
  if (membershipError) throw membershipError;
  const membership = memberships?.find(
    (item) => item.tenant_id === profile?.active_tenant_id,
  ) ?? memberships?.[0];
  if (!membership) {
    throw new HttpError("Empresa não vinculada ao usuário", 403);
  }
  return {
    admin,
    user: authData.user,
    tenantId: membership.tenant_id as string,
    role: membership.role as string,
  };
}

function cleanText(value: unknown, field: string, max: number): string {
  if (typeof value !== "string") throw new HttpError(`${field} inválido`, 400);
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > max) {
    throw new HttpError(`${field} inválido`, 400);
  }
  return cleaned;
}

function numericId(value: unknown, field: string): string {
  const cleaned = cleanText(value, field, 40);
  if (!/^[0-9]{5,40}$/.test(cleaned)) {
    throw new HttpError(`${field} inválido`, 400);
  }
  return cleaned;
}

async function graphJson(url: string, token: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({})) as {
    error?: { message?: string; code?: number };
    [key: string]: unknown;
  };
  if (!response.ok || payload.error) {
    const code = payload.error?.code ? ` (${payload.error.code})` : "";
    throw new HttpError(`Credencial Meta rejeitada${code}`, 400);
  }
  return payload;
}

async function verifyMeta(
  wabaId: string,
  phoneNumberId: string,
  token: string,
): Promise<Record<string, unknown>> {
  const fields = [
    "id",
    "display_phone_number",
    "verified_name",
    "quality_rating",
    "code_verification_status",
  ].join(",");
  const phone = await graphJson(
    `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}?fields=${fields}`,
    token,
  );
  if (String(phone.id ?? "") !== phoneNumberId) {
    throw new HttpError("Phone Number ID não foi confirmado pela Meta", 400);
  }
  const numbers = await graphJson(
    `https://graph.facebook.com/${API_VERSION}/${wabaId}/phone_numbers?fields=id&limit=100`,
    token,
  );
  const belongsToWaba = Array.isArray(numbers.data) &&
    numbers.data.some((item) =>
      typeof item === "object" && item !== null &&
      String((item as { id?: unknown }).id ?? "") === phoneNumberId
    );
  if (!belongsToWaba) {
    throw new HttpError("O número informado não pertence ao WABA", 400);
  }
  return phone;
}

function sanitizedCredential(
  session: Record<string, unknown>,
  credential?: Record<string, unknown> | null,
) {
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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: cors(request) });
  }
  if (request.method !== "POST") {
    return json(request, { error: "Método não permitido" }, 405);
  }

  try {
    const context = await authorize(request);
    const body = await request.json().catch(() => {
      throw new HttpError("JSON inválido", 400);
    }) as Record<string, unknown>;
    const action = cleanText(body.action, "Ação", 20).toLowerCase();
    if (!["get", "save", "test", "remove"].includes(action)) {
      throw new HttpError("Ação inválida", 400);
    }

    if (action === "get") {
      const { data: sessions, error } = await context.admin
        .from("prospecta_whatsapp_sessions")
        .select("id, name, provider, status")
        .eq("tenant_id", context.tenantId)
        .eq("provider", "meta_cloud_api")
        .is("deleted_at", null)
        .order("created_at");
      if (error) throw error;
      const { data: credentials, error: credentialError } = await context.admin
        .from("prospecta_whatsapp_cloud_credentials")
        .select(
          "whatsapp_session_id, waba_id, phone_number_id, display_phone_number, verified_name, quality_rating, code_verification_status, api_version, status, last_verified_at, last_error, app_secret_ciphertext",
        )
        .eq("tenant_id", context.tenantId);
      if (credentialError) throw credentialError;
      const bySession = new Map(
        (credentials ?? []).map((item) => [item.whatsapp_session_id, item]),
      );
      return json(request, {
        sessions: (sessions ?? []).map((session) =>
          sanitizedCredential(session, bySession.get(session.id))
        ),
      });
    }

    if (!["owner", "admin"].includes(context.role)) {
      throw new HttpError(
        "Apenas proprietário ou administrador pode alterar a integração",
        403,
      );
    }

    if (action === "remove") {
      const sessionId = cleanText(body.session_id, "Sessão", 36);
      const { data: session } = await context.admin
        .from("prospecta_whatsapp_sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("tenant_id", context.tenantId)
        .eq("provider", "meta_cloud_api")
        .is("deleted_at", null)
        .maybeSingle();
      if (!session) throw new HttpError("Sessão Meta não encontrada", 404);
      const { error: deleteError } = await context.admin
        .from("prospecta_whatsapp_cloud_credentials")
        .delete()
        .eq("tenant_id", context.tenantId)
        .eq("whatsapp_session_id", sessionId);
      if (deleteError) throw deleteError;
      const { error: sessionError } = await context.admin
        .from("prospecta_whatsapp_sessions")
        .update({
          status: "disconnected",
          connected_number: null,
          last_error: null,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("tenant_id", context.tenantId);
      if (sessionError) throw sessionError;
      return json(request, { ok: true });
    }

    const wabaId = numericId(body.waba_id, "WABA ID");
    const phoneNumberId = numericId(body.phone_number_id, "Phone Number ID");
    const token = cleanText(body.token, "Token", 4096);
    if (token.length < 20) throw new HttpError("Token inválido", 400);
    const appSecret = cleanText(body.app_secret, "App Secret", 500);
    if (appSecret.length < 16) throw new HttpError("App Secret inválido", 400);
    const phone = await verifyMeta(wabaId, phoneNumberId, token);

    if (action === "test") {
      return json(request, {
        ok: true,
        phone: {
          id: phone.id,
          display_phone_number: phone.display_phone_number ?? null,
          verified_name: phone.verified_name ?? null,
          quality_rating: phone.quality_rating ?? null,
          code_verification_status: phone.code_verification_status ?? null,
        },
      });
    }

    const sessionName = cleanText(body.session_name, "Nome da sessão", 120);
    const requestedSessionId = typeof body.session_id === "string"
      ? body.session_id.trim()
      : "";
    let sessionId = requestedSessionId;
    if (sessionId) {
      const { data: existing } = await context.admin
        .from("prospecta_whatsapp_sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("tenant_id", context.tenantId)
        .eq("provider", "meta_cloud_api")
        .is("deleted_at", null)
        .maybeSingle();
      if (!existing) throw new HttpError("Sessão Meta não encontrada", 404);
      const { error } = await context.admin
        .from("prospecta_whatsapp_sessions")
        .update({
          name: sessionName,
          status: "ready",
          connected_number: phone.display_phone_number ?? null,
          last_error: null,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("tenant_id", context.tenantId);
      if (error) throw error;
    } else {
      const { data: created, error } = await context.admin
        .from("prospecta_whatsapp_sessions")
        .insert({
          tenant_id: context.tenantId,
          name: sessionName,
          owner_id: context.user.id,
          provider: "meta_cloud_api",
          status: "ready",
          connected_number: phone.display_phone_number ?? null,
          last_seen_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error || !created) throw error ?? new Error("Falha ao criar sessão");
      sessionId = created.id;
    }

    const encryptedToken = await encrypt(token);
    const encryptedAppSecret = await encrypt(appSecret);
    const { error: upsertError } = await context.admin
      .from("prospecta_whatsapp_cloud_credentials")
      .upsert({
        tenant_id: context.tenantId,
        whatsapp_session_id: sessionId,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        display_phone_number: phone.display_phone_number ?? null,
        verified_name: phone.verified_name ?? null,
        quality_rating: phone.quality_rating ?? null,
        code_verification_status: phone.code_verification_status ?? null,
        api_version: API_VERSION,
        token_ciphertext: encryptedToken.ciphertext,
        token_iv: encryptedToken.iv,
        app_secret_ciphertext: encryptedAppSecret.ciphertext,
        app_secret_iv: encryptedAppSecret.iv,
        status: "active",
        last_verified_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "tenant_id,whatsapp_session_id" });
    if (upsertError) throw upsertError;

    return json(request, {
      ok: true,
      session_id: sessionId,
      status: "active",
      display_phone_number: phone.display_phone_number ?? null,
      verified_name: phone.verified_name ?? null,
      api_version: API_VERSION,
    });
  } catch (error) {
    console.error("whatsapp-meta-config:", error);
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError
      ? error.message
      : "Não foi possível processar a configuração Meta";
    return json(request, { error: message }, status);
  }
});
