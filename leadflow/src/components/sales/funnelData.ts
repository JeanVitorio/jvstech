// Cálculos do salão de vendas. Tudo sai do que já existe no banco:
// leads, etapas e usuários — nenhuma coluna nova.

export interface LeadResumo {
  id: string;
  name: string;
  owner_id: string | null;
  stage_id: string | null;
  estimated_value: number | null;
  next_followup_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EtapaResumo {
  id: string;
  is_won: boolean;
  is_lost: boolean;
}

export interface VendedorResumo {
  id: string;
  nome: string;
  email: string;
  avatar?: string | null;
  emNegociacao: number;
  valorEmNegociacao: number;
  ganhosNoMes: number;
  valorGanhoNoMes: number;
  atrasados: number;
  paraHoje: number;
  ganhouAgora: boolean;
}

export type Temperatura = "quente" | "morno" | "esfriando" | "frio";

const DIA = 86_400_000;

export function diasParado(lead: LeadResumo): number {
  const referencia = lead.updated_at ?? lead.created_at;
  if (!referencia) return 0;
  const tempo = Date.now() - new Date(referencia).getTime();
  return Math.max(0, Math.floor(tempo / DIA));
}

// Lead parado é venda esfriando: o tempo sem movimento vira um aviso no card.
export function temperaturaDoLead(lead: LeadResumo): Temperatura {
  const dias = diasParado(lead);
  if (dias <= 2) return "quente";
  if (dias <= 6) return "morno";
  if (dias <= 14) return "esfriando";
  return "frio";
}

export const ROTULO_TEMPERATURA: Record<Temperatura, string> = {
  quente: "Quente",
  morno: "Morno",
  esfriando: "Esfriando",
  frio: "Frio",
};

export const COR_TEMPERATURA: Record<Temperatura, string> = {
  quente: "#22c55e",
  morno: "#ffb000",
  esfriando: "#ff6500",
  frio: "#64748b",
};

function mesmoMes(data: string | undefined, referencia: Date): boolean {
  if (!data) return false;
  const valor = new Date(data);
  return (
    valor.getMonth() === referencia.getMonth() &&
    valor.getFullYear() === referencia.getFullYear()
  );
}

export function montarVendedores(
  usuarios: { id: string; name: string; email: string; avatar_url?: string | null }[],
  leads: LeadResumo[],
  etapas: EtapaResumo[],
  // Proprietário e administrador veem a equipe toda, inclusive quem está sem lead.
  mostrarTodos = false,
): VendedorResumo[] {
  const ganhas = new Set(etapas.filter((e) => e.is_won).map((e) => e.id));
  const perdidas = new Set(etapas.filter((e) => e.is_lost).map((e) => e.id));
  const agora = new Date();
  const fimDoDia = new Date(agora);
  fimDoDia.setHours(23, 59, 59, 999);

  const comLead = new Set(
    leads.map((lead) => lead.owner_id).filter((id): id is string => Boolean(id)),
  );

  return usuarios
    .filter((usuario) => mostrarTodos || comLead.has(usuario.id))
    .map((usuario) => {
      const meus = leads.filter((lead) => lead.owner_id === usuario.id);
      const abertos = meus.filter(
        (lead) =>
          !ganhas.has(lead.stage_id ?? "") && !perdidas.has(lead.stage_id ?? ""),
      );
      const ganhosDoMes = meus.filter(
        (lead) => ganhas.has(lead.stage_id ?? "") && mesmoMes(lead.updated_at, agora),
      );
      const ganhouAgora = meus.some(
        (lead) =>
          ganhas.has(lead.stage_id ?? "") &&
          lead.updated_at != null &&
          Date.now() - new Date(lead.updated_at).getTime() < DIA,
      );

      return {
        id: usuario.id,
        nome: usuario.name,
        email: usuario.email,
        avatar: usuario.avatar_url,
        emNegociacao: abertos.length,
        valorEmNegociacao: abertos.reduce(
          (soma, lead) => soma + Number(lead.estimated_value || 0),
          0,
        ),
        ganhosNoMes: ganhosDoMes.length,
        valorGanhoNoMes: ganhosDoMes.reduce(
          (soma, lead) => soma + Number(lead.estimated_value || 0),
          0,
        ),
        atrasados: abertos.filter(
          (lead) =>
            lead.next_followup_at != null &&
            new Date(lead.next_followup_at).getTime() < agora.getTime(),
        ).length,
        paraHoje: abertos.filter((lead) => {
          if (!lead.next_followup_at) return false;
          const quando = new Date(lead.next_followup_at).getTime();
          return quando >= agora.getTime() && quando <= fimDoDia.getTime();
        }).length,
        ganhouAgora,
      };
    })
    .sort(
      (a, b) =>
        b.valorGanhoNoMes - a.valorGanhoNoMes ||
        b.valorEmNegociacao - a.valorEmNegociacao ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    );
}
