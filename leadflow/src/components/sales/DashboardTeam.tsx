import { AlertTriangle, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ProducaoVendedor } from "./dashboardData";

const reais = (valor: number) => {
  if (valor >= 1_000_000)
    return `R$ ${(valor / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (valor >= 1_000) return `R$ ${Math.round(valor / 1_000).toLocaleString("pt-BR")} mil`;
  return `R$ ${Math.round(valor).toLocaleString("pt-BR")}`;
};

// Produção da equipe no período: quem fechou, quem está negociando e quem está atrasado.
export function DashboardTeam({ producao }: { producao: ProducaoVendedor[] }) {
  if (!producao.length) return null;
  const maior = Math.max(...producao.map((item) => item.valorGanho), 1);

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Equipe no período</h3>
      </div>

      <div className="space-y-3">
        {producao.map((vendedor) => (
          <div key={vendedor.id}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-medium">{vendedor.nome}</span>
              <span className="shrink-0 tabular-nums text-success">
                {reais(vendedor.valorGanho)}
              </span>
            </div>
            <Progress value={(vendedor.valorGanho / maior) * 100} className="mt-1.5 h-1.5" />
            <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
              <span>{vendedor.ganhos} fechamento(s)</span>
              <span>
                {vendedor.emNegociacao} negociando · {reais(vendedor.valorEmNegociacao)}
              </span>
              {vendedor.atrasados > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-3 w-3" /> {vendedor.atrasados} atrasado(s)
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
