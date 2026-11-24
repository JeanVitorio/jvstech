import { ArrowDownRight, ArrowUpRight, CheckCircle2, Minus, Percent, Target, TrendingUp, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { variacao, type Indicadores } from "./dashboardData";

const reais = (valor: number) => `R$ ${Math.round(valor).toLocaleString("pt-BR")}`;

interface DashboardMetricsProps {
  atual: Indicadores;
  anterior: Indicadores | null;
  rotuloComparativo: string;
}

// Números do topo, cada um comparado com a janela anterior de mesmo tamanho.
export function DashboardMetrics({ atual, anterior, rotuloComparativo }: DashboardMetricsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <Metrica
        icone={Target}
        rotulo="Leads no funil"
        valor={atual.abertos.toLocaleString("pt-BR")}
        detalhe="negociações abertas"
      />
      <Metrica
        icone={TrendingUp}
        rotulo="Pipeline"
        valor={reais(atual.pipeline)}
        detalhe="valor em aberto"
        tom="primary"
      />
      <Metrica
        icone={CheckCircle2}
        rotulo="Ganhos no período"
        valor={reais(atual.valorGanho)}
        detalhe={`${atual.ganhos} negócio(s)`}
        tom="success"
        diferenca={anterior ? variacao(atual.valorGanho, anterior.valorGanho) : null}
        rotuloComparativo={rotuloComparativo}
      />
      <Metrica
        icone={Percent}
        rotulo="Conversão"
        valor={`${atual.conversao}%`}
        detalhe={`${atual.ganhos} ganhos · ${atual.perdidos} perdidos`}
        diferenca={anterior ? variacao(atual.conversao, anterior.conversao) : null}
        rotuloComparativo={rotuloComparativo}
      />
      <Metrica
        icone={Wallet}
        rotulo="Ticket médio"
        valor={reais(atual.ticketMedio)}
        detalhe="por negócio ganho"
        diferenca={anterior ? variacao(atual.ticketMedio, anterior.ticketMedio) : null}
        rotuloComparativo={rotuloComparativo}
      />
    </div>
  );
}

function Metrica({
  icone: Icone,
  rotulo,
  valor,
  detalhe,
  tom = "neutro",
  diferenca,
  rotuloComparativo,
}: {
  icone: typeof Target;
  rotulo: string;
  valor: string;
  detalhe?: string;
  tom?: "neutro" | "primary" | "success";
  diferenca?: number | null;
  rotuloComparativo?: string;
}) {
  const cores = {
    neutro: "",
    primary: "text-primary",
    success: "text-success",
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icone className="h-3 w-3" /> {rotulo}
      </div>
      <p className={`mt-2 truncate font-display text-2xl font-bold ${cores[tom]}`}>{valor}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground">
        {detalhe && <span>{detalhe}</span>}
        {diferenca !== undefined && diferenca !== null && (
          <Comparativo valor={diferenca} rotulo={rotuloComparativo} />
        )}
      </div>
    </Card>
  );
}

function Comparativo({ valor, rotulo }: { valor: number; rotulo?: string }) {
  const Icone = valor > 0 ? ArrowUpRight : valor < 0 ? ArrowDownRight : Minus;
  const cor = valor > 0 ? "text-success" : valor < 0 ? "text-destructive" : "text-muted-foreground";
  return (
    <span className={`flex items-center gap-0.5 ${cor}`} title={rotulo}>
      <Icone className="h-3 w-3" />
      {Math.abs(valor)}%
    </span>
  );
}
