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
  const admin = createClient(supabaseUrl, serviceRole);
  const [{ data: profile }, { data: memberships, error: membershipError }] = await Promise.all([
    admin.from("profiles").select("active_tenant_id").eq("id", authData.user.id).maybeSingle(),
    admin.from("tenant_memberships").select("tenant_id, role").eq("user_id", authData.user.id).not("accepted_at", "is", null).order("created_at", { ascending: true })
  ]);
  if (membershipError) throw membershipError;
  const membership = memberships?.find((item) => item.tenant_id === profile?.active_tenant_id) ?? memberships?.[0];
  if (!membership) {
    throw new AuthorizationError("Empresa n\xE3o vinculada ao usu\xE1rio", 403);
  }
  if (!["owner", "admin"].includes(membership.role)) {
    throw new AuthorizationError(
      "Apenas o propriet\xE1rio ou administrador pode alterar a assinatura",
      403
    );
  }
  const { data: tenant, error: tenantError } = await admin.from("tenants").select("id").eq("id", membership.tenant_id).maybeSingle();
  if (tenantError || !tenant) {
    throw new AuthorizationError("Empresa n\xE3o encontrada", 403);
  }
  const tenantId = membership.tenant_id;
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
async function resolvePlanPriceId(stripe, plan) {
  const priceId = configuredPriceId(plan.code) || plan.stripe_price_id;
  if (priceId || !plan.stripe_product_id) return priceId;
  const product = await stripe.products.retrieve(plan.stripe_product_id, {
    expand: ["default_price"]
  });
  const defaultPrice = typeof product.default_price === "string" ? product.default_price : product.default_price?.id ?? null;
  if (defaultPrice) return defaultPrice;
  const prices = await stripe.prices.list({
    product: plan.stripe_product_id,
    active: true,
    type: "recurring",
    limit: 100
  });
  return prices.data.find(
    (price) => price.currency === "brl" && price.unit_amount === plan.monthly_price_cents && price.recurring?.interval === "month"
  )?.id ?? null;
}
function configuredPriceId(planCode) {
  const keyByPlan = {
    basic: "STRIPE_PRICE_BASIC",
    plus: "STRIPE_PRICE_PLUS",
    pro: "STRIPE_PRICE_PRO"
  };
  const key = keyByPlan[planCode];
  const value = key ? Deno.env.get(key)?.trim() : null;
  return value?.startsWith("price_") ? value : null;
}

// supabase/functions/_shared/portal.ts
var METADATA_KEY = "leadflow_portal";
async function leadflowPortalConfigurationId(stripe, admin) {
  const { data: plans, error } = await admin.from("subscription_plans").select("code, monthly_price_cents, stripe_product_id, stripe_price_id").eq("active", true).neq("code", "free").order("monthly_price_cents");
  if (error) throw error;
  const products = [];
  for (const plan of plans ?? []) {
    const priceId = await resolvePlanPriceId(stripe, plan);
    if (plan.stripe_product_id && priceId) {
      products.push({ product: plan.stripe_product_id, prices: [priceId] });
    }
  }
  const signature = `v1:${products.map((item) => item.prices[0]).join(",")}`;
  const existing = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 100
  });
  const found = existing.data.find(
    (configuration) => configuration.metadata?.[METADATA_KEY] === signature
  );
  if (found) return found.id;
  const created = await stripe.billingPortal.configurations.create({
    business_profile: {
      privacy_policy_url: appUrl("/privacidade"),
      terms_of_service_url: appUrl("/termos")
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ["email", "address", "tax_id"]
      },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        proration_behavior: "none",
        cancellation_reason: {
          enabled: true,
          options: [
            "too_expensive",
            "missing_features",
            "switched_service",
            "unused",
            "other"
          ]
        }
      },
      subscription_update: products.length > 1 ? {
        enabled: true,
        default_allowed_updates: ["price"],
        products,
        proration_behavior: "create_prorations"
      } : { enabled: false }
    },
    metadata: { [METADATA_KEY]: signature }
  });
  return created.id;
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
    const { tenantId, tenantRole, admin } = await authorizeTenantManager(request);
    if (tenantRole !== "owner") {
      throw new AuthorizationError(
        "Apenas quem criou a conta pode gerenciar a cobran\xE7a",
        403
      );
    }
    const { data: tenant, error } = await admin.from("tenants").select("stripe_customer_id").eq("id", tenantId).single();
    if (error || !tenant?.stripe_customer_id) {
      return jsonResponse(
        request,
        { error: "Este cliente ainda n\xE3o possui assinatura Stripe" },
        409
      );
    }
    const stripe = getStripe();
    const configuration = await leadflowPortalConfigurationId(stripe, admin).catch(
      (configError) => {
        console.error("Configura\xE7\xE3o do portal indispon\xEDvel:", configError);
        return void 0;
      }
    );
    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      configuration,
      return_url: appUrl("/LeadFlow/billing")
    });
    return jsonResponse(request, { url: session.url });
  } catch (error) {
    console.error("create-portal-session:", error);
    const status = error instanceof AuthorizationError ? error.status : 500;
    const message = error instanceof AuthorizationError ? error.message : "N\xE3o foi poss\xEDvel abrir o portal";
    return jsonResponse(request, { error: message }, status);
  }
});
