// @ts-nocheck
// Arquivo autocontido para colar diretamente no painel do Supabase.
// supabase/functions/stripe-webhook/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

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

// supabase/functions/stripe-webhook/index.ts
var handledEvents = /* @__PURE__ */ new Set([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed"
]);
Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("M\xE9todo n\xE3o permitido", { status: 405 });
  }
  const signature = request.headers.get("stripe-signature") ?? "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  const body = await request.text();
  if (!signature || !webhookSecret) {
    return new Response("Webhook n\xE3o configurado", { status: 500 });
  }
  let event;
  try {
    event = await getStripe().webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      void 0,
      stripeCryptoProvider
    );
  } catch (error) {
    console.error("Assinatura Stripe inv\xE1lida:", error);
    return new Response("Assinatura inv\xE1lida", { status: 400 });
  }
  if (!handledEvents.has(event.type)) {
    return Response.json({ received: true, ignored: true });
  }
  try {
    const subscription = await subscriptionFromEvent(event);
    if (!subscription) {
      return Response.json({ received: true, ignored: true });
    }
    const tenantId = subscription.metadata.tenant_id;
    if (!tenantId) {
      throw new Error("Assinatura Stripe sem tenant_id");
    }
    const item = subscription.items.data[0];
    if (!item) throw new Error("Assinatura Stripe sem pre\xE7o");
    const productId = typeof item.price.product === "string" ? item.price.product : item.price.product.id;
    const period = subscriptionPeriod(subscription);
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    const payloadHash = await sha256(body);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) {
      throw new Error("Configura\xE7\xE3o Supabase indispon\xEDvel");
    }
    const admin = createClient(supabaseUrl, serviceRole);
    const { error } = await admin.rpc(
      "prospecta_sync_stripe_subscription",
      {
        p_event_id: event.id,
        p_event_type: event.type,
        p_event_created_at: new Date(event.created * 1e3).toISOString(),
        p_payload_hash: payloadHash,
        p_tenant_id: tenantId,
        p_customer_id: customerId,
        p_subscription_id: subscription.id,
        p_price_id: item.price.id,
        p_product_id: productId,
        p_status: event.type === "invoice.payment_failed" ? "past_due" : subscription.status,
        p_period_start: new Date(period.start * 1e3).toISOString(),
        p_period_end: new Date(period.end * 1e3).toISOString(),
        p_cancel_at_period_end: subscription.cancel_at_period_end
      }
    );
    if (error) throw error;
    // Depois das tentativas de cobrança a Stripe pode marcar a assinatura como "unpaid":
    // ela é encerrada para a conta voltar ao Free pelo evento de exclusão.
    if (subscription.status === "unpaid") {
      try {
        await getStripe().subscriptions.cancel(subscription.id);
      } catch (cancelError) {
        console.error("Falha ao encerrar assinatura n\xE3o paga:", cancelError);
      }
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error(`Falha ao processar ${event.type}:`, error);
    return new Response("Falha tempor\xE1ria no webhook", { status: 500 });
  }
});
async function subscriptionFromEvent(event) {
  const stripe = getStripe();
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    return event.data.object;
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const subscriptionId = objectId(session.subscription);
    return subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null;
  }
  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    const raw = invoice;
    const subscriptionId = objectId(
      raw.subscription ?? raw.parent?.subscription_details?.subscription ?? null
    );
    return subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null;
  }
  return null;
}
function subscriptionPeriod(subscription) {
  const rawSubscription = subscription;
  const rawItem = subscription.items.data[0];
  const start = rawSubscription.current_period_start ?? rawItem.current_period_start;
  const end = rawSubscription.current_period_end ?? rawItem.current_period_end;
  if (!start || !end) {
    throw new Error("Per\xEDodo da assinatura Stripe ausente");
  }
  return { start, end };
}
function objectId(value) {
  if (typeof value === "string") return value;
  return value?.id ?? null;
}
async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
