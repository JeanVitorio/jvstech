import { CheckCircle2, Loader2, MonitorSmartphone, WifiOff } from "lucide-react";
import { useAppInstallation } from "@/hooks/useBots";
import { cn } from "@/lib/utils";

function lastSeenLabel(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Mostra, em tempo real, se algum PC da empresa já está com o app conectado.
export function AppStatusCard() {
  const { data, isLoading, isError } = useAppInstallation();

  const state = isError
    ? "error"
    : isLoading || !data
    ? "loading"
    : data.online
      ? "online"
      : data.installed
        ? "offline"
        : "waiting";

  const content = {
    loading: {
      icon: Loader2,
      title: "Verificando o app...",
      text: "Consultando se algum PC da sua empresa está conectado.",
      tone: "text-muted-foreground bg-muted",
    },
    error: {
      icon: WifiOff,
      title: "Não foi possível verificar agora",
      text: "Confira sua internet e recarregue a página em instantes.",
      tone: "text-muted-foreground bg-muted",
    },
    waiting: {
      icon: MonitorSmartphone,
      title: "Aguardando a instalação",
      text: "Assim que você entrar no app pelo PC, este status fica verde sozinho.",
      tone: "text-primary bg-primary/15",
    },
    offline: {
      icon: WifiOff,
      title: "App instalado, mas fechado",
      text: `${data?.runnerName ?? "Seu PC"} se conectou pela última vez em ${lastSeenLabel(
        data?.lastSeenAt ?? null,
      )}. Abra o app para os agentes trabalharem.`,
      tone: "text-warning bg-warning/15",
    },
    online: {
      icon: CheckCircle2,
      title: "App conectado",
      text: `${data?.runnerName ?? "Seu PC"} está online. Você já pode criar e iniciar agentes.`,
      tone: "text-success bg-success/15",
    },
  }[state];
  const Icon = content.icon;

  return (
    <div
      className="premium-panel flex items-start gap-3 rounded-3xl p-4"
      role="status"
      aria-live="polite"
    >
      <span className={cn("relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl", content.tone)}>
        <Icon className={cn("h-5 w-5", state === "loading" && "animate-spin")} aria-hidden="true" />
        {(state === "waiting" || state === "online") && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-background",
              state === "online" ? "bg-success" : "animate-pulse bg-primary",
            )}
          />
        )}
      </span>
      <div className="min-w-0">
        <p className="font-display text-sm font-bold">{content.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{content.text}</p>
      </div>
    </div>
  );
}
