import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppLoader } from "@/components/AppLoader";
import { PageHeader } from "@/components/PageHeader";
import { PeriodFilter, periodRange, type Period } from "@/components/PeriodFilter";
import { DashboardChart } from "@/components/sales/DashboardChart";
import { DashboardMetrics } from "@/components/sales/DashboardMetrics";
import { DashboardTeam } from "@/components/sales/DashboardTeam";
import { DashboardToday } from "@/components/sales/DashboardToday";
import {
  calcularIndicadores,
  fechamentosPorSemana,
  janelaAnterior,
  montarAgenda,
  montarProducao,
  type EtapaPainel,
  type LeadPainel,
} from "@/components/sales/dashboardData";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/AppStore";

// Só as colunas que o painel usa: nada de notas, mensagens longas ou links.
const COLUNAS_PAINEL =
  "id,name,stage_id,owner_id,estimated_value,next_followup_at,created_at,updated_at," +
  "whatsapp,phone,first_contact_message";

interface EventoComercial {
  id: string;
  title: string;
  start_at: string;
  kind: string;
}

export default function SalesDashboard() {
  const { user } = useAuth();
  const { users } = useApp();

  // Proprietário e administrador também lideram: a conta é a mesma do funil.
  const podeVerEquipe = Boolean(user?.is_leader);

  const [leads, setLeads] = useState<LeadPainel[]>([]);
  const [etapas, setEtapas] = useState<EtapaPainel[]>([]);
  const [eventos, setEventos] = useState<EventoComercial[]>([]);
  const [periodo, setPeriodo] = useState<Period>({ preset: "month" });
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    let consultaLeads = supabase.from("leads").select(COLUNAS_PAINEL);
    let consultaEventos = supabase
      .from("sales_events")
      .select("id,title,start_at,kind")
      .gte("start_at", new Date().toISOString())
      .order("start_at")
      .limit(5);

    if (!podeVerEquipe && user?.id) {
      consultaLeads = consultaLeads.eq("owner_id", user.id);
      consultaEventos = consultaEventos.eq("owner_id", user.id);
    }

    const [retornoLeads, retornoEtapas, retornoEventos] = await Promise.all([
      consultaLeads,
      supabase.from("lead_stages").select("id,name,color,is_won,is_lost").order("position"),
      consultaEventos,
    ]);

    if (retornoLeads.data) setLeads(retornoLeads.data as unknown as LeadPainel[]);
    if (retornoEtapas.data) setEtapas(retornoEtapas.data as unknown as EtapaPainel[]);
    if (retornoEventos.data) setEventos(retornoEventos.data as unknown as EventoComercial[]);
  }, [podeVerEquipe, user?.id]);

  // Carrega uma vez por sessão da tela. Atualizar em tempo real a cada lead
  // que o robô insere derrubava o banco; quem quiser recarregar usa o botão do topo.
  useEffect(() => {
    setCarregando(true);
    void carregar().finally(() => setCarregando(false));
  }, [carregar]);

  const janela = useMemo(() => periodRange(periodo), [periodo]);
  const anterior = useMemo(() => janelaAnterior(periodo), [periodo]);

  const indicadores = useMemo(
    () => calcularIndicadores(leads, etapas, janela),
    [leads, etapas, janela],
  );
  const indicadoresAnteriores = useMemo(
    () => (anterior ? calcularIndicadores(leads, etapas, anterior) : null),
    [leads, etapas, anterior],
  );
  const agenda = useMemo(() => montarAgenda(leads, etapas), [leads, etapas]);
  const semanas = useMemo(
    () => fechamentosPorSemana(leads, etapas, janela),
    [leads, etapas, janela],
  );
  const producao = useMemo(
    () => (podeVerEquipe ? montarProducao(users, leads, etapas, janela) : []),
    [podeVerEquipe, users, leads, etapas, janela],
  );

  return (
    <div className="mx-auto max-w-7xl p-4">
      <PageHeader
        title="Dashboard de Vendas"
        subtitle={
          podeVerEquipe
            ? "Como está o comercial hoje e o que precisa de ação."
            : "Seus números e o que precisa de ação hoje."
        }
        actions={<PeriodFilter value={periodo} onChange={setPeriodo} />}
      />

      {carregando ? (
        <Card>
          <AppLoader variant="inline" label="Carregando painel" />
        </Card>
      ) : (
        <div className="space-y-6">
          <DashboardMetrics
            atual={indicadores}
            anterior={indicadoresAnteriores}
            rotuloComparativo="comparado ao período anterior"
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardToday agenda={agenda} />
            <DashboardChart semanas={semanas} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {podeVerEquipe && <DashboardTeam producao={producao} />}

            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Próximos eventos</h3>
                <Link to="/sales/agenda">
                  <Button size="sm" variant="ghost">
                    Ver agenda
                  </Button>
                </Link>
              </div>
              <div className="space-y-2">
                {eventos.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sem eventos próximos</p>
                )}
                {eventos.map((evento) => (
                  <div key={evento.id} className="rounded-lg bg-muted/30 p-3">
                    <p className="text-sm font-medium">{evento.title}</p>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(evento.start_at).toLocaleString("pt-BR")}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {evento.kind}
                      </Badge>
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
