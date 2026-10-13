export type PlanCode = "free" | "basic" | "plus" | "pro";

export interface SubscriptionPlan {
  code: PlanCode;
  name: string;
  monthly_price_cents: number;
  leads_per_month: number;
  user_limit: number;
  admin_limit: number;
}

export interface BillingStatus {
  tenant_id: string;
  plan_code: PlanCode;
  plan_name: string;
  status: string;
  monthly_price_cents: number;
  leads_limit: number;
  leads_used: number;
  leads_remaining: number;
  user_limit: number;
  users_used: number;
  users_remaining: number;
  admin_limit: number;
  admins_used: number;
  admins_remaining: number;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}
