import { MonitorOff, ShieldCheck } from "lucide-react";
import { useOnlineRunners } from "@/hooks/useBots";
import { WhatsappConnectCard } from "./WhatsappConnectCard";

// Painel da página de agentes: um WhatsApp de validação por PC com o app aberto.
export function WhatsappValidationPanel() {
  const runners = useOnlineRunners();

  return (
    <section className="premium-panel relative mb-6 overflow-hidden rounded-[1.75rem] p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#25d366]/10 blur-3xl" />
      <div className="relative mb-4 flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#25d366] text-white shadow-[0_10px_26px_-10px_#25d366]">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold">WhatsApp de validação</h2>
          <p className="mt-0.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            O app usa um WhatsApp conectado no PC só para conferir se o número de cada lead existe
            no WhatsApp. Nenhuma mensagem é enviada. Prefira um número secundário.
          </p>
        </div>
      </div>

      {runners.isLoading ? null : runners.data?.length ? (
        <div className="relative grid gap-3 xl:grid-cols-2">
          {runners.data.map((runner) => (
            <WhatsappConnectCard key={runner.id} runnerId={runner.id} runnerName={runner.name} />
          ))}
        </div>
      ) : (
        <p className="relative flex items-center gap-2 rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <MonitorOff className="h-4 w-4 shrink-0" />
          Abra o app LeadFlow no PC para conectar o WhatsApp de validação.
        </p>
      )}
    </section>
  );
}
