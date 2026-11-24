// Cálculos do painel comercial. Usa só colunas que já existem na tabela de leads.
import { periodRange, type Period } from "@/components/PeriodFilter";
import { diasParado, type LeadResumo } from "./funnelData";

export interface LeadPainel extends LeadResumo {
  whatsapp?: string | null;
  phone?: string | null;
  first_contact_message?: string | null;
}

export interface EtapaPainel {
  id: string;
  name: string;
  color: string;
  is_won: boolean;
  is_lost: boolean;
}

export interface Indicadores {
  abertos: number;
  pipeline: number;
  ganhos: number;
  valorGanho: number;
  perdidos: number;
  conversao: number;
  ticketMedio: number;
}

const DIA = 86_400_000;

const soma = (leads: LeadPainel[]) =>
  leads.reduce((total, lead) => total + Number(lead.estimated_value || 0), 0);

// Janela imediatamente anterior, do mesmo tamanho, para o comparativo.
export function janelaAnterior(periodo: Period): { from: Date; to: Date } | null {
  const atual = periodRange(periodo);
  if (!atual) return null;
  const duracao = atual.to.getTime() - atual.from.getTime();
  return {
    from: new Date(atual.from.getTime() - duracao),
    to: new Date(atual.from.getTime()),
  };
}

const dentro = (data: string | null | undefined, janela: { from: Date; to: Date } | null) => {
  if (!data) return false;
  if (!janela) return true;
  const momento = new Date(data).getTime();
  return momento >= janela.from.getTime() && momento <= janela.to.getTime();
};

export function calcularIndicadores(
  leads: LeadPainel[],
  etapas: EtapaPainel[],
  janela: { from: Date; to: Date } | null,
): Indicadores {
  const ganhas = new Set(etapas.filter((etapa) => etapa.is_won).map((etapa) => etapa.id));
  const perdidas = new Set(etapas.filter((etapa) => etapa.is_lost).map((etapa) => etapa.id));

  const abertos = leads.filter(
    (lead) => !ganhas.has(lead.stage_id ?? "") && !perdidas.has(lead.stage_id ?? ""),
  );
  const ganhos = leads.filter(
    (lead) => ganhas.has(lead.stage_id ?? "") && dentro(lead.updated_at, janela),
  );
  const perdidos = leads.filter(
    (lead) => perdidas.has(lead.stage_id ?? "") && dentro(lead.updated_at, janela),
  );

  const fechados = ganhos.length + perdidos.length;
  const valorGanho = soma(ganhos);

  return {
    abertos: abertos.length,
    pipeline: soma(abertos),
    ganhos: ganhos.length,
    valorGanho,
    perdidos: perdidos.length,
    conversao: fechados ? Math.round((ganhos.length / fechados) * 100) : 0,
    ticketMedio: ganhos.length ? Math.round(valorGanho / ganhos.length) : 0,
  };
}

// Variação percentual; devolve null quando não há base de comparação.
export function variacao(atual: number, anterior: number): number | null {
  if (!anterior) return atual ? null : 0;
  return Math.round(((atual - anterior) / anterior) * 100);
}

export interface AgendaDoDia {
  atrasados: LeadPainel[];
  hoje: LeadPainel[];
  esfriando: LeadPainel[];
}

// O que precisa de ação agora, sem depender de coluna nova no banco.
export function montarAgenda(leads: LeadPainel[], etapas: EtapaPainel[]): AgendaDoDia {
  const ganhas = new Set(etapas.filter((etapa) => etapa.is_won).map((etapa) => etapa.id));
  const perdidas = new Set(etapas.filter((etapa) => etapa.is_lost).map((etapa) => etapa.id));
  const abertos = leads.filter(
    (lead) => !ganhas.has(lead.stage_id ?? "") && !perdidas.has(lead.stage_id ?? ""),
  );

  const agora = Date.now();
  const fimDoDia = new Date();
  fimDoDia.setHours(23, 59, 59, 999);

  const porData = (a: LeadPainel, b: LeadPainel) =>
    new Date(a.next_followup_at ?? 0).getTime() - new Date(b.next_followup_at ?? 0).getTime();

  const atrasados = abertos
    .filter((lead) => lead.next_followup_at && new Date(lead.next_followup_at).getTime() < agora)
    .sort(porData);

  const hoje = abertos
    .filter((lead) => {
      if (!lead.next_followup_at) return false;
      const quando = new Date(lead.next_followup_at).getTime();
      return quando >= agora && quando <= fimDoDia.getTime();
    })
    .sort(porData);

  // Esfriando: negociação que já saiu da primeira etapa, sem retorno marcado e
  // parada há mais de duas semanas. Lead novo que ninguém abordou não entra aqui.
  const entrada = etapas[0]?.id;
  const esfriando = abertos
    .filter(
      (lead) =>
        lead.stage_id !== entrada && !lead.next_followup_at && diasParado(lead) > 14,
    )
    .sort((a, b) => diasParado(b) - diasParado(a));

  return { atrasados, hoje, esfriando };
}

export interface SemanaFechamento {
  rotulo: string;
  ganhos: number;
  valor: number;
}

// Fechamentos agrupados por semana dentro do período escolhido.
export function fechamentosPorSemana(
  leads: LeadPainel[],
  etapas: EtapaPainel[],
  janela: { from: Date; to: Date } | null,
  semanas = 8,
): SemanaFechamento[] {
  const ganhas = new Set(etapas.filter((etapa) => etapa.is_won).map((etapa) => etapa.id));
  const fim = janela ? janela.to : new Date();
  const inicio = janela
    ? janela.from
    : new Date(fim.getTime() - semanas * 7 * DIA);

  const totalSemanas = Math.max(
    1,
    Math.min(semanas, Math.ceil((fim.getTime() - inicio.getTime()) / (7 * DIA))),
  );
  const tamanho = (fim.getTime() - inicio.getTime()) / totalSemanas;

  const baldes: SemanaFechamento[] = Array.from({ length: totalSemanas }, (_, indice) => {
    const comeco = new Date(inicio.getTime() + indice * tamanho);
    return {
      rotulo: comeco.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      ganhos: 0,
      valor: 0,
    };
  });

  for (const lead of leads) {
    if (!ganhas.has(lead.stage_id ?? "") || !lead.updated_at) continue;
    const momento = new Date(lead.updated_at).getTime();
    if (momento < inicio.getTime() || momento > fim.getTime()) continue;
    const indice = Math.min(
      totalSemanas - 1,
      Math.floor((momento - inicio.getTime()) / tamanho),
    );
    baldes[indice].ganhos += 1;
    baldes[indice].valor += Number(lead.estimated_value || 0);
  }

  return baldes;
}

export interface ProducaoVendedor {
  id: string;
  nome: string;
  emNegociacao: number;
  valorEmNegociacao: number;
  ganhos: number;
  valorGanho: number;
  atrasados: number;
}

// Produção por vendedor respeitando o período escolhido no topo da tela.
export function montarProducao(
  usuarios: { id: string; name: string }[],
  leads: LeadPainel[],
  etapas: EtapaPainel[],
  janela: { from: Date; to: Date } | null,
): ProducaoVendedor[] {
  const ganhas = new Set(etapas.filter((etapa) => etapa.is_won).map((etapa) => etapa.id));
  const perdidas = new Set(etapas.filter((etapa) => etapa.is_lost).map((etapa) => etapa.id));
  const agora = Date.now();

  return usuarios
    .map((usuario) => {
      const meus = leads.filter((lead) => lead.owner_id === usuario.id);
      const abertos = meus.filter(
        (lead) => !ganhas.has(lead.stage_id ?? "") && !perdidas.has(lead.stage_id ?? ""),
      );
      const ganhos = meus.filter(
        (lead) => ganhas.has(lead.stage_id ?? "") && dentro(lead.updated_at, janela),
      );
      return {
        id: usuario.id,
        nome: usuario.name,
        emNegociacao: abertos.length,
        valorEmNegociacao: soma(abertos),
        ganhos: ganhos.length,
        valorGanho: soma(ganhos),
        atrasados: abertos.filter(
          (lead) =>
            lead.next_followup_at && new Date(lead.next_followup_at).getTime() < agora,
        ).length,
      };
    })
    .sort(
      (a, b) =>
        b.valorGanho - a.valorGanho ||
        b.valorEmNegociacao - a.valorEmNegociacao ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    );
}
