import type { BillingStatus } from "@/types/billing";

// Status da assinatura na Stripe traduzidos para o cliente.
const STATUS_LABELS: Record<string, string> = {
  active: "Ativa",
  trialing: "Em teste",
  past_due: "Pagamento pendente",
  unpaid: "Não paga",
  canceled: "Cancelada",
  incomplete: "Pagamento incompleto",
  incomplete_expired: "Expirada",
  paused: "Pausada",
};

// Cancelamento agendado: a assinatura segue ativa até o fim do período pago.
export function isCancellationScheduled(status: BillingStatus) {
  return status.plan_code !== "free" && status.cancel_at_period_end;
}

export function billingStatusLabel(status: BillingStatus) {
  if (isCancellationScheduled(status)) return "Cancelada";
  return STATUS_LABELS[status.status] ?? status.status;
}

export function billingPeriodEndLabel(status: BillingStatus) {
  if (!status.current_period_end) return null;
  return new Date(status.current_period_end).toLocaleDateString("pt-BR");
}
