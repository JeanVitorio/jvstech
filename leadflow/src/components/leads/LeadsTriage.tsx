import { AlertTriangle, Copy, PhoneOff, UserMinus, Users } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface ContagensTriagem {
  total: number;
  semResponsavel: number;
  semContato: number;
  semEtapa: number;
}

export type AtalhoTriagem = "todos" | "sem_responsavel" | "sem_contato" | "sem_etapa" | "duplicados";

interface LeadsTriageProps {
  contagens: ContagensTriagem;
  carregando: boolean;
  duplicados: number | null;
  procurandoDuplicados: boolean;
  atalhoAtivo: AtalhoTriagem;
  onAtalho: (atalho: AtalhoTriagem) => void;
}

// Cada número é um atalho: clicar filtra a tabela por aquele problema.
export function LeadsTriage({
  contagens,
  carregando,
  duplicados,
  procurandoDuplicados,
  atalhoAtivo,
  onAtalho,
}: LeadsTriageProps) {
  const valor = (numero: number) => (carregando ? "…" : numero.toLocaleString("pt-BR"));

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Bloco
        icone={Users}
        rotulo="Leads na base"
        valor={valor(contagens.total)}
        ativo={atalhoAtivo === "todos"}
        onClick={() => onAtalho("todos")}
      />
      <Bloco
        icone={UserMinus}
        rotulo="Sem responsável"
        valor={valor(contagens.semResponsavel)}
        alerta={contagens.semResponsavel > 0}
        ativo={atalhoAtivo === "sem_responsavel"}
        onClick={() => onAtalho("sem_responsavel")}
      />
      <Bloco
        icone={PhoneOff}
        rotulo="Sem telefone"
        valor={valor(contagens.semContato)}
        alerta={contagens.semContato > 0}
        ativo={atalhoAtivo === "sem_contato"}
        onClick={() => onAtalho("sem_contato")}
      />
      <Bloco
        icone={AlertTriangle}
        rotulo="Fora do funil"
        valor={valor(contagens.semEtapa)}
        alerta={contagens.semEtapa > 0}
        ativo={atalhoAtivo === "sem_etapa"}
        onClick={() => onAtalho("sem_etapa")}
      />
      <Bloco
        icone={Copy}
        rotulo={duplicados === null ? "Procurar duplicados" : "Duplicados"}
        valor={
          procurandoDuplicados
            ? "…"
            : duplicados === null
              ? "—"
              : duplicados.toLocaleString("pt-BR")
        }
        alerta={!!duplicados}
        ativo={atalhoAtivo === "duplicados"}
        onClick={() => onAtalho("duplicados")}
      />
    </div>
  );
}

function Bloco({
  icone: Icone,
  rotulo,
  valor,
  alerta,
  ativo,
  onClick,
}: {
  icone: typeof Users;
  rotulo: string;
  valor: string;
  alerta?: boolean;
  ativo?: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(evento) => {
        if (evento.key === "Enter" || evento.key === " ") onClick();
      }}
      className={`cursor-pointer p-3 transition hover:border-primary/50 ${
        ativo ? "border-primary bg-primary/5" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <Icone
          className={`h-4 w-4 shrink-0 ${alerta ? "text-warning" : "text-muted-foreground"}`}
        />
        <span className="truncate text-xs text-muted-foreground">{rotulo}</span>
      </div>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{valor}</p>
    </Card>
  );
}
