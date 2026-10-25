import { AuthorizationError, authorizeTenantManager } from "../_shared/auth.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { appUrl, getStripe } from "../_shared/stripe.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Método não permitido" }, 405);
  }

  try {
    const { tenantId, tenantRole, admin } = await authorizeTenantManager(request);
    // O portal permite cancelar a assinatura: só quem criou a conta pode abrir.
    if (tenantRole !== "owner") {
      throw new AuthorizationError(
        "Apenas quem criou a conta pode gerenciar a cobrança",
        403,
      );
    }
    const { data: tenant, error } = await admin
      .from("tenants")
      .select("stripe_customer_id")
      .eq("id", tenantId)
      .single();
    if (error || !tenant?.stripe_customer_id) {
      return jsonResponse(
        request,
        { error: "Este cliente ainda não possui assinatura Stripe" },
        409,
      );
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: appUrl("/LeadFlow/billing"),
    });
    return jsonResponse(request, { url: session.url });
  } catch (error) {
    console.error("create-portal-session:", error);
    const status = error instanceof AuthorizationError
      ? error.status
      : 500;
    const message = error instanceof Error
      ? error.message
      : "Não foi possível abrir o portal";
    return jsonResponse(request, { error: message }, status);
  }
});
