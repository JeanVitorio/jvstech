import { AuthorizationError, authorizeTenantManager } from "../_shared/auth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  appUrl,
  configuredPriceId,
  getStripe,
} from "../_shared/stripe.ts";

const paidPlans = new Set(["basic", "plus", "pro"]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Método não permitido" }, 405);
  }

  try {
    const { user, tenantId, admin } =
      await authorizeTenantManager(request);
    const body = await request.json() as { plan_code?: string };
    const planCode = body.plan_code?.trim().toLowerCase() ?? "";
    if (!paidPlans.has(planCode)) {
      return jsonResponse(request, { error: "Plano pago inválido" }, 400);
    }

    const [{ data: plan, error: planError }, {
      data: tenant,
      error: tenantError,
    }, { data: currentSubscription }] = await Promise.all([
      admin
        .from("subscription_plans")
        .select("code, stripe_product_id, stripe_price_id")
        .eq("code", planCode)
        .eq("active", true)
        .single(),
      admin
        .from("tenants")
        .select("name, stripe_customer_id")
        .eq("id", tenantId)
        .single(),
      admin
        .from("tenant_subscriptions")
        .select("stripe_subscription_id, status")
        .eq("tenant_id", tenantId)
        .maybeSingle(),
    ]);
    if (planError || !plan || tenantError || !tenant) {
      throw new Error("Plano ou empresa não encontrados");
    }
    if (
      currentSubscription?.stripe_subscription_id &&
      ["active", "trialing", "past_due"].includes(
        currentSubscription.status,
      )
    ) {
      return jsonResponse(
        request,
        {
          error:
            "Use o Portal do Cliente para trocar seu plano atual.",
          use_portal: true,
        },
        409,
      );
    }

    const stripe = getStripe();
    let customerId = tenant.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: tenant.name,
        email: user.email,
        metadata: { tenant_id: tenantId },
      });
      customerId = customer.id;
      const { error } = await admin
        .from("tenants")
        .update({ stripe_customer_id: customerId })
        .eq("id", tenantId);
      if (error) throw error;
    }

    let priceId =
      configuredPriceId(planCode) ||
      (plan.stripe_price_id as string | null);
    if (!priceId && plan.stripe_product_id) {
      const product = await stripe.products.retrieve(
        plan.stripe_product_id,
        { expand: ["default_price"] },
      );
      priceId = typeof product.default_price === "string"
        ? product.default_price
        : product.default_price?.id ?? null;
    }
    if (!priceId) {
      throw new Error(
        `Preço mensal do plano ${planCode} não configurado`,
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
        metadata: { tenant_id: tenantId, plan_code: planCode },
      },
      success_url: appUrl(
        "/LeadFlow/billing?checkout=success",
      ),
      cancel_url: appUrl(
        "/LeadFlow/billing?checkout=cancelled",
      ),
    });

    return jsonResponse(request, { url: session.url });
  } catch (error) {
    console.error("create-checkout-session:", error);
    const status = error instanceof AuthorizationError
      ? error.status
      : 500;
    const message = error instanceof Error
      ? error.message
      : "Não foi possível iniciar o pagamento";
    return jsonResponse(request, { error: message }, status);
  }
});
