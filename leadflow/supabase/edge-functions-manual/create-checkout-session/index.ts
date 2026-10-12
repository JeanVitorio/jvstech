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
  const tenantId = membership.tenant_id;
  const { data: tenant, error: tenantError } = await admin.from("tenants").select("id").eq("id", tenantId).maybeSingle();
  if (tenantError || !tenant) {
    throw new AuthorizationError("Empresa n\xE3o encontrada", 403);
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

// supabase/functions/create-checkout-session/index.ts
var paidPlans = /* @__PURE__ */ new Set(["basic", "plus", "pro"]);
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return jsonResponse(request, { error: "M\xE9todo n\xE3o permitido" }, 405);
  }
  try {
    const { user, tenantId, admin } = await authorizeTenantManager(request);
    const body = await request.json();
    const planCode = body.plan_code?.trim().toLowerCase() ?? "";
    if (!paidPlans.has(planCode)) {
      return jsonResponse(request, { error: "Plano pago inv\xE1lido" }, 400);
    }
    const [{ data: plan, error: planError }, {
      data: tenant,
      error: tenantError
    }, { data: currentSubscription }] = await Promise.all([
      admin.from("subscription_plans").select("code, monthly_price_cents, stripe_product_id, stripe_price_id").eq("code", planCode).eq("active", true).single(),
      admin.from("tenants").select("name, stripe_customer_id").eq("id", tenantId).single(),
      admin.from("tenant_subscriptions").select("stripe_subscription_id, status").eq("tenant_id", tenantId).maybeSingle()
    ]);
    if (planError || !plan || tenantError || !tenant) {
      throw new Error("Plano ou empresa n\xE3o encontrados");
    }
    if (currentSubscription?.stripe_subscription_id && ["active", "trialing", "past_due"].includes(
      currentSubscription.status
    )) {
      return jsonResponse(
        request,
        {
          error: "Use o Portal do Cliente para trocar seu plano atual.",
          use_portal: true
        },
        409
      );
    }
    const stripe = getStripe();
    let customerId = tenant.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: tenant.name,
        email: user.email,
        metadata: { tenant_id: tenantId }
      });
      customerId = customer.id;
      const { error } = await admin.from("tenants").update({ stripe_customer_id: customerId }).eq("id", tenantId);
      if (error) throw error;
    }
    let priceId = configuredPriceId(planCode) || plan.stripe_price_id;
    if (!priceId && plan.stripe_product_id) {
      const product = await stripe.products.retrieve(
        plan.stripe_product_id,
        { expand: ["default_price"] }
      );
      priceId = typeof product.default_price === "string" ? product.default_price : product.default_price?.id ?? null;
      if (!priceId) {
        const prices = await stripe.prices.list({
          product: plan.stripe_product_id,
          active: true,
          type: "recurring",
          limit: 100
        });
        priceId = prices.data.find(
          (price) => price.currency === "brl" && price.unit_amount === plan.monthly_price_cents && price.recurring?.interval === "month"
        )?.id ?? null;
      }
    }
    if (!priceId) {
      throw new Error(
        `Pre\xE7o mensal do plano ${planCode} n\xE3o configurado`
      );
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: tenantId,
      metadata: { tenant_id: tenantId, plan_code: planCode },
      subscription_data: {
        metadata: { tenant_id: tenantId, plan_code: planCode }
      },
      success_url: appUrl(
        "/LeadFlow/billing?checkout=success"
      ),
      cancel_url: appUrl(
        "/LeadFlow/billing?checkout=cancelled"
      )
    });
    return jsonResponse(request, { url: session.url });
  } catch (error) {
    console.error("create-checkout-session:", error);
    const status = error instanceof AuthorizationError ? error.status : 500;
    const message = error instanceof Error ? error.message : "N\xE3o foi poss\xEDvel iniciar o pagamento";
    return jsonResponse(request, { error: message }, status);
  }
});
