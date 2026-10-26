// @ts-nocheck
// Arquivo autocontido para colar diretamente no painel do Supabase.
// supabase/functions/delete-account/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

// supabase/functions/_shared/cors.ts
var allowedOrigins = (Deno.env.get("LEADFLOW_ALLOWED_ORIGINS") ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
function corsHeaders(request) {
  const origin = request.headers.get("origin") ?? "";
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}
function jsonResponse(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json"
    }
  });
}

// supabase/functions/_shared/stripe.ts
import Stripe from "npm:stripe@18.5.0";
var stripeClient = null;
var stripeCryptoProvider = Stripe.createSubtleCryptoProvider();
function getStripe() {
  if (stripeClient) return stripeClient;
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY n\xE3o configurada");
  }
  stripeClient = new Stripe(secretKey);
  return stripeClient;
}

// supabase/functions/delete-account/index.ts
var CONFIRMATION_TEXT = "EXCLUIR";
var ACTIVE_SUBSCRIPTION = /* @__PURE__ */ new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused"
]);
var DeleteAccountError = class extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
};
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return jsonResponse(request, { error: "M\xE9todo n\xE3o permitido" }, 405);
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRole) {
      throw new Error("Configura\xE7\xE3o Supabase indispon\xEDvel");
    }
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      throw new DeleteAccountError("Autoriza\xE7\xE3o necess\xE1ria", 401);
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } }
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    const user = authData?.user;
    if (authError || !user?.email) {
      throw new DeleteAccountError("Sess\xE3o inv\xE1lida ou expirada", 401);
    }
    const body = await request.json().catch(() => ({}));
    if (body.confirmation !== CONFIRMATION_TEXT) {
      throw new DeleteAccountError(`Digite ${CONFIRMATION_TEXT} para confirmar`, 400);
    }
    const password = typeof body.password === "string" ? body.password : "";
    if (!password || password.length > 200) {
      throw new DeleteAccountError("Informe sua senha", 400);
    }
    const passwordCheck = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { error: passwordError } = await passwordCheck.auth.signInWithPassword({
      email: user.email,
      password
    });
    if (passwordError) {
      throw new DeleteAccountError("Senha incorreta", 401);
    }
    await passwordCheck.auth.signOut({ scope: "local" }).catch(() => void 0);
    const admin = createClient(supabaseUrl, serviceRole);
    const { data: memberships, error: membershipError } = await admin.from("tenant_memberships").select("tenant_id, role").eq("user_id", user.id);
    if (membershipError) throw membershipError;
    const ownedTenantIds = (memberships ?? []).filter((item) => item.role === "owner").map((item) => item.tenant_id);
    const tenants = await loadTenants(admin, ownedTenantIds);
    if (tenants.some((tenant) => tenant.slug === "jvs-leadflow")) {
      throw new DeleteAccountError(
        "Esta conta principal n\xE3o pode ser exclu\xEDda pelo app",
        403
      );
    }
    const affectedUsers = /* @__PURE__ */ new Set([user.id]);
    for (const tenant of tenants) {
      if (tenant.stripe_customer_id) {
        await cancelSubscriptions(tenant.stripe_customer_id);
      }
      const { data: tenantUsers, error } = await admin.rpc(
        "prospecta_delete_tenant_account",
        { p_tenant_id: tenant.id }
      );
      if (error) throw error;
      for (const userId of tenantUsers ?? []) {
        affectedUsers.add(userId);
      }
    }
    for (const userId of affectedUsers) {
      if (userId !== user.id && await hasOtherMemberships(admin, userId)) continue;
      await removeAvatars(admin, userId);
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    }
    return jsonResponse(request, { ok: true });
  } catch (error) {
    console.error("delete-account:", error);
    if (error instanceof DeleteAccountError) {
      return jsonResponse(request, { error: error.message }, error.status);
    }
    return jsonResponse(
      request,
      { error: "N\xE3o foi poss\xEDvel excluir a conta. Tente novamente." },
      500
    );
  }
});
async function loadTenants(admin, tenantIds) {
  if (!tenantIds.length) return [];
  const { data, error } = await admin.from("tenants").select("id, slug, stripe_customer_id").in("id", tenantIds);
  if (error) throw error;
  return data ?? [];
}
async function cancelSubscriptions(customerId) {
  const stripe = getStripe();
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100
  });
  for (const subscription of subscriptions.data) {
    if (ACTIVE_SUBSCRIPTION.has(subscription.status)) {
      await stripe.subscriptions.cancel(subscription.id);
    }
  }
}
async function hasOtherMemberships(admin, userId) {
  const { count, error } = await admin.from("tenant_memberships").select("tenant_id", { count: "exact", head: true }).eq("user_id", userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}
async function removeAvatars(admin, userId) {
  const bucket = admin.storage.from("avatars");
  const { data: files } = await bucket.list(userId, { limit: 1e3 });
  const paths = (files ?? []).map((file) => `${userId}/${file.name}`);
  if (paths.length) await bucket.remove(paths);
}
