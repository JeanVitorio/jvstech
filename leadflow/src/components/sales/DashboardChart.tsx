import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { SemanaFechamento } from "./dashboardData";

// Evolução dos fechamentos dentro do período escolhido.
export function DashboardChart({ semanas }: { semanas: SemanaFechamento[] }) {
  const vazio = semanas.every((semana) => semana.ganhos === 0);

  return (
    <Card className="p-5">
      <div className="mb-3">
        <h3 className="font-semibold">Fechamentos no período</h3>
        <p className="text-xs text-muted-foreground">Negócios ganhos por semana</p>
      </div>

      {vazio ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nenhum negócio fechado no período selecionado.
        </p>
      ) : (
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={semanas} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="jvs-ganhos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="rotulo" tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.35)" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="rgba(255,255,255,0.35)" />
              <Tooltip
                contentStyle={{
                  background: "#15161b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(valor: number, nome: string) =>
                  nome === "valor"
                    ? [`R$ ${Number(valor).toLocaleString("pt-BR")}`, "Valor"]
                    : [valor, "Fechamentos"]
                }
                labelFormatter={(rotulo: string) => `Semana de ${rotulo}`}
              />
              <Area
                type="monotone"
                dataKey="ganhos"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#jvs-ganhos)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
