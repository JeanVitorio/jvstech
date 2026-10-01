import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  MapPin,
  Play,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import { useBots } from "@/hooks/useBots";
import { botStatusLabel, botVisualStatus } from "@/lib/bots";
import { listRecentBotEvents } from "@/services/bots";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const bots = useBots();
  const runtimes = useMemo(() => bots.data ?? [], [bots.data]);
  const ids = runtimes.map((item) => item.config.id).join(",");
  const events = useQuery({
    queryKey: ["bots", "recent-events", ids],
    queryFn: () => listRecentBotEvents(),
    enabled: Boolean(runtimes.length),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });
  const leads = useQuery({
    queryKey: ["dashboard", "leads-count", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: 1,
  });

  const stats = useMemo(() => {
    const statuses = runtimes.map(botVisualStatus);
    return {
      total: runtimes.length,
      running: statuses.filter((status) =>
        ["running", "starting", "stopping"].includes(status),
      ).length,
      paused: statuses.filter((status) => status === "paused").length,
      attention: statuses.filter((status) =>
        ["failed", "offline"].includes(status),
      ).length,
      verified: runtimes.reduce(
        (sum, item) =>
          sum + Number(item.checkpoints.scraper?.state.empresas_verificadas || 0),
        0,
      ),
    };
  }, [runtimes]);

  const activeBots = runtimes
    .filter((runtime) =>
      ["running", "starting", "paused", "stopping"].includes(
        botVisualStatus(runtime),
      ),
    )
    .slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <Card className="relative overflow-hidden p-7 border-0 bg-gradient-to-br from-card via-card to-accent/10">
        <div className="absolute -right-16 -top-20 w-72 h-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex items-end justify-between gap-5 flex-wrap">
          <div>
            <Badge className="mb-3 bg-accent/15 text-accent border-0">
              <Activity className="w-3 h-3 mr-1" /> operação em tempo real
            </Badge>
            <h1 className="font-display text-3xl sm:text-4xl font-bold">
              Central de prospecção
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              {user?.role === "leader"
                ? "Acompanhe todos os executores, bots e leads da operação."
                : "Acompanhe seus bots e os leads gerados pela prospecção."}
            </p>
          </div>
          <Button onClick={() => navigate("/bots")}>
            <Bot className="w-4 h-4 mr-2" /> Abrir painel dos bots
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={Bot} label="Bots disponíveis" value={stats.total} />
        <Metric icon={Play} label="Em execução" value={stats.running} tone="success" />
        <Metric
          icon={AlertTriangle}
          label="Precisam de atenção"
          value={stats.attention}
          tone={stats.attention ? "danger" : "muted"}
        />
        <Metric icon={Users} label="Leads no funil" value={leads.data ?? 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-xl font-semibold">Bots ativos</h2>
              <p className="text-sm text-muted-foreground">
                {stats.verified} empresas verificadas · {stats.paused} pausado(s)
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/bots")}>
              Ver todos
            </Button>
          </div>
          <div className="space-y-3">
            {activeBots.map((runtime) => {
              const state = runtime.checkpoints.scraper?.state ?? {};
              const current = Number(state.indice_cidade || 0);
              const total = Number(
                state.total_cidades || runtime.config.cities.length || 0,
              );
              return (
                <button
                  key={runtime.config.id}
                  onClick={() => navigate("/bots")}
                  className="w-full text-left rounded-xl border border-border p-4 hover:bg-muted/40 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{runtime.config.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        Cidade {current} de {total}
                        {state.cidade_atual ? ` · ${state.cidade_atual}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {botStatusLabel(botVisualStatus(runtime))}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <Progress value={total ? (current / total) * 100 : 0} className="h-1.5" />
                    <span className="text-xs text-muted-foreground shrink-0">
                      {current}/{total}
                    </span>
                  </div>
                </button>
              );
            })}
            {!bots.isLoading && !activeBots.length && (
              <div className="py-10 text-center text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-success" />
                Nenhum bot em execução neste momento.
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-xl font-semibold">Atividade recente</h2>
          <p className="text-sm text-muted-foreground mb-5">Eventos dos bots visíveis</p>
          <div className="space-y-4">
            {(events.data ?? []).slice(0, 8).map((event) => (
              <div key={event.event_id} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{event.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(event.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
            {!events.isLoading && !events.data?.length && (
              <p className="text-sm text-muted-foreground">Nenhum evento recente.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone = "accent",
}: {
  icon: typeof Bot;
  label: string;
  value: number;
  tone?: "accent" | "success" | "danger" | "muted";
}) {
  const colors = {
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
    danger: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <Card className="p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="font-display text-3xl font-bold mt-4 tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </Card>
  );
}
