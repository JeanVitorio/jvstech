import type Stripe from "npm:stripe@18.5.0";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { appUrl, type PlanPriceSource, resolvePlanPriceId } from "./stripe.ts";

const METADATA_KEY = "leadflow_portal";

// Configuração do Portal do Cliente definida pelo código, sem depender do painel da Stripe:
// cancelamento sempre no fim do período pago e troca entre os planos pagos.
export async function leadflowPortalConfigurationId(
  stripe: Stripe,
  admin: SupabaseClient,
): Promise<string> {
  const { data: plans, error } = await admin
    .from("subscription_plans")
    .select("code, monthly_price_cents, stripe_product_id, stripe_price_id")
    .eq("active", true)
    .neq("code", "free")
    .order("monthly_price_cents");
  if (error) throw error;

  const products: { product: string; prices: string[] }[] = [];
  for (const plan of (plans ?? []) as PlanPriceSource[]) {
    const priceId = await resolvePlanPriceId(stripe, plan);
    if (plan.stripe_product_id && priceId) {
      products.push({ product: plan.stripe_product_id, prices: [priceId] });
    }
  }

  // Muda quando os preços mudam, gerando uma configuração nova.
  const signature = `v1:${products.map((item) => item.prices[0]).join(",")}`;
  const existing = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 100,
  });
  const found = existing.data.find(
    (configuration) => configuration.metadata?.[METADATA_KEY] === signature,
  );
  if (found) return found.id;

  const created = await stripe.billingPortal.configurations.create({
    business_profile: {
      privacy_policy_url: appUrl("/privacidade"),
      terms_of_service_url: appUrl("/termos"),
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ["email", "address", "tax_id"],
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
            "other",
          ],
        },
      },
      subscription_update: products.length > 1
        ? {
          enabled: true,
          default_allowed_updates: ["price"],
          products,
          proration_behavior: "create_prorations",
        }
        : { enabled: false },
    },
    metadata: { [METADATA_KEY]: signature },
  });
  return created.id;
}
