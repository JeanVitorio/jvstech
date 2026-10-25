import { describe, expect, it } from "vitest";
import {
  billingPeriodEndLabel,
  billingStatusLabel,
  isCancellationScheduled,
} from "@/lib/billingStatus";
import type { BillingStatus } from "@/types/billing";

const status = (overrides: Partial<BillingStatus>): BillingStatus =>
  ({
    plan_code: "basic",
    status: "active",
    cancel_at_period_end: false,
    current_period_end: "2026-11-15T12:00:00+00:00",
    ...overrides,
  }) as BillingStatus;

describe("billingStatus", () => {
  it("traduz o status da Stripe", () => {
    expect(billingStatusLabel(status({}))).toBe("Ativa");
    expect(billingStatusLabel(status({ status: "past_due" }))).toBe("Pagamento pendente");
  });

  it("mostra cancelada quando o cancelamento está agendado", () => {
    const cancelada = status({ cancel_at_period_end: true });
    expect(isCancellationScheduled(cancelada)).toBe(true);
    expect(billingStatusLabel(cancelada)).toBe("Cancelada");
    expect(billingPeriodEndLabel(cancelada)).toBe("15/11/2026");
  });

  it("ignora o agendamento no plano Free", () => {
    expect(isCancellationScheduled(status({ plan_code: "free", cancel_at_period_end: true }))).toBe(
      false,
    );
  });
});
