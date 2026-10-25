import Stripe from "npm:stripe@18.5.0";

let stripeClient: Stripe | null = null;
export const stripeCryptoProvider = Stripe.createSubtleCryptoProvider();

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY não configurada");
  }
  stripeClient = new Stripe(secretKey);
  return stripeClient;
}

export function appUrl(path = ""): string {
  const configured = (Deno.env.get("LEADFLOW_APP_URL") ?? "").trim().replace(/\/+$/, "");
  if (!configured.startsWith("https://")) {
    throw new Error("LEADFLOW_APP_URL deve ser uma URL HTTPS");
  }
  return `${configured}${path}`;
}

export interface PlanPriceSource {
  code: string;
  monthly_price_cents: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
}

// Preço mensal do plano: secret, banco, preço padrão do produto ou preço mensal em BRL.
export async function resolvePlanPriceId(
  stripe: Stripe,
  plan: PlanPriceSource,
): Promise<string | null> {
  const priceId = configuredPriceId(plan.code) || plan.stripe_price_id;
  if (priceId || !plan.stripe_product_id) return priceId;

  const product = await stripe.products.retrieve(plan.stripe_product_id, {
    expand: ["default_price"],
  });
  const defaultPrice = typeof product.default_price === "string"
    ? product.default_price
    : (product.default_price?.id ?? null);
  if (defaultPrice) return defaultPrice;

  const prices = await stripe.prices.list({
    product: plan.stripe_product_id,
    active: true,
    type: "recurring",
    limit: 100,
  });
  return prices.data.find(
    (price) =>
      price.currency === "brl" &&
      price.unit_amount === plan.monthly_price_cents &&
      price.recurring?.interval === "month",
  )?.id ?? null;
}

export function configuredPriceId(planCode: string): string | null {
  const keyByPlan: Record<string, string> = {
    basic: "STRIPE_PRICE_BASIC",
    plus: "STRIPE_PRICE_PLUS",
    pro: "STRIPE_PRICE_PRO",
  };
  const key = keyByPlan[planCode];
  const value = key ? Deno.env.get(key)?.trim() : null;
  return value?.startsWith("price_") ? value : null;
}
