import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { runnerWhatsappSession } from "@/services/whatsappValidation";
import type { WhatsappRunnerSession } from "@/types/bots";

const session = (overrides: Partial<WhatsappRunnerSession>): WhatsappRunnerSession => ({
  id: "s",
  runner_id: "pc-1",
  purpose: "validation",
  status: "disconnected",
  connected_number: null,
  qr_code_data_url: null,
  last_error: null,
  ...overrides,
});

describe("runnerWhatsappSession", () => {
  it("prioriza a sessão de validação do PC", () => {
    const sessions = [
      session({ id: "msg", purpose: "message", status: "ready" }),
      session({ id: "val", status: "qr_pending" }),
    ];
    expect(runnerWhatsappSession(sessions, "pc-1")?.id).toBe("val");
  });

  it("usa a sessão de mensagens conectada quando não há validação", () => {
    const sessions = [session({ id: "msg", purpose: "message", status: "ready" })];
    expect(runnerWhatsappSession(sessions, "pc-1")?.id).toBe("msg");
  });

  it("ignora sessões de outros PCs", () => {
    const sessions = [session({ id: "val", runner_id: "pc-2", status: "ready" })];
    expect(runnerWhatsappSession(sessions, "pc-1")).toBeUndefined();
  });
});
