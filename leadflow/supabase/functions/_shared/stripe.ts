import Stripe from "npm:stripe@18.5.0";

let stripeClient: Stripe | null = null;
export const stripeCryptoProvider =
  Stripe.createSubtleCryptoProvider();

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
  const configured = (Deno.env.get("LEADFLOW_APP_URL") ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!configured.startsWith("https://")) {
    throw new Error("LEADFLOW_APP_URL deve ser uma URL HTTPS");
  }
  return `${configured}${path}`;
}

export function configuredPriceId(planCode: string): string | null {
  const keyByPlan: Record<string, string> = {
    basic: "STRIPE_PRICE_BASIC",
    plus: "STRIPE_PRICE_PLUS",
    pro: "STRIPE_PRICE_PRO",
  };
  const key = keyByPlan[planCode];
  return key ? Deno.env.get(key)?.trim() || null : null;
}
