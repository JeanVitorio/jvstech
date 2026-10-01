import type { BotRuntime } from "@/types/bots";

export type BotVisualStatus =
  | "running"
  | "paused"
  | "starting"
  | "stopping"
  | "failed"
  | "completed"
  | "offline"
  | "idle";

export function botVisualStatus(runtime: BotRuntime): BotVisualStatus {
  const checkpoint = runtime.checkpoints.scraper;
  const command = runtime.control?.command;
  const leaseActive =
    checkpoint?.lease_expires_at &&
    new Date(checkpoint.lease_expires_at).getTime() > Date.now();

  if (checkpoint?.runner_id && !leaseActive) return "offline";
  if (command === "pausado" && leaseActive) return "paused";
  if (command === "parado" && leaseActive) return "stopping";
  if (checkpoint?.status === "starting" && leaseActive) return "starting";
  if (checkpoint?.status === "running" && leaseActive) return "running";
  if (checkpoint?.status === "failed") return "failed";
  if (checkpoint?.status === "completed") return "completed";
  return "idle";
}

export function botStatusLabel(status: BotVisualStatus): string {
  return {
    running: "Executando",
    paused: "Pausado",
    starting: "Iniciando",
    stopping: "Parando",
    failed: "Falhou",
    completed: "Concluído",
    offline: "Executor offline",
    idle: "Inativo",
  }[status];
}

export function isBotActive(runtime: BotRuntime): boolean {
  return ["running", "paused", "starting", "stopping"].includes(
    botVisualStatus(runtime),
  );
}
