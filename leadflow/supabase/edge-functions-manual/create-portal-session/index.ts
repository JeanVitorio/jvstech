// @ts-nocheck
// Arquivo autocontido para colar diretamente no painel do Supabase.
// supabase/functions/_shared/auth.ts
import { createClient } from "npm:@supabase/supabase-js@2";
async function authorizeTenantManager(request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new AuthorizationError("Autoriza\xE7\xE3o necess\xE1ria", 401);
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRole) {
    throw new Error("Configura\xE7\xE3o Supabase indispon\xEDvel");
  }
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } }
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    throw new AuthorizationError("Sess\xE3o inv\xE1lida ou expirada", 401);
  }
  const { data: tenantId, error: tenantError } = await userClient.rpc("current_tenant_id");
  if (tenantError || !tenantId) {
    throw new AuthorizationError("Empresa n\xE3o vinculada ao usu\xE1rio", 403);
  }
  const admin = createClient(supabaseUrl, serviceRole);
  const { data: membership, error: membershipError } = await admin.from("tenant_memberships").select("role").eq("tenant_id", tenantId).eq("user_id", authData.user.id).not("accepted_at", "is", null).maybeSingle();
  if (membershipError || !membership || !["owner", "admin"].includes(membership.role)) {
    throw new AuthorizationError(
      "Apenas respons\xE1veis pela assinatura podem realizar esta a\xE7\xE3o",
      403
    );
  }
  return {
    user: authData.user,
    tenantId,
    tenantRole: membership.role,
    admin
  };
}
var AuthorizationError = class extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
};

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
function appUrl(path = "") {
  const configured = (Deno.env.get("LEADFLOW_APP_URL") ?? "").trim().replace(/\/+$/, "");
  if (!configured.startsWith("https://")) {
    throw new Error("LEADFLOW_APP_URL deve ser uma URL HTTPS");
  }
  return `${configured}${path}`;
}

// supabase/functions/create-portal-session/index.ts
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return jsonResponse(request, { error: "M\xE9todo n\xE3o permitido" }, 405);
  }
  try {
    const { tenantId, admin } = await authorizeTenantManager(request);
    const { data: tenant, error } = await admin.from("tenants").select("stripe_customer_id").eq("id", tenantId).single();
    if (error || !tenant?.stripe_customer_id) {
      return jsonResponse(
        request,
        { error: "Este cliente ainda n\xE3o possui assinatura Stripe" },
        409
      );
    }
    const session = await getStripe().billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: appUrl("/LeadFlow/billing")
    });
    return jsonResponse(request, { url: session.url });
  } catch (error) {
    console.error("create-portal-session:", error);
    const status = error instanceof AuthorizationError ? error.status : 500;
    const message = error instanceof Error ? error.message : "N\xE3o foi poss\xEDvel abrir o portal";
    return jsonResponse(request, { error: message }, status);
  }
});
