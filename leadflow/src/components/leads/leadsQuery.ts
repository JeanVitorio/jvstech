import { supabase } from "@/integrations/supabase/client";

// Lead reduzido: só o que a tabela de triagem mostra, para não trafegar notas e mensagens.
export interface LeadLista {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  whatsapp_do_not_contact: boolean | null;
  city: string | null;
  niche: string | null;
  source: string | null;
  estimated_value: number | null;
  stage_id: string | null;
  owner_id: string | null;
  next_followup_at: string | null;
  google_maps_url: string | null;
  first_contact_message: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const COLUNAS_LISTA =
  "id,name,company,email,phone,whatsapp,whatsapp_do_not_contact,city,niche,source," +
  "estimated_value,stage_id,owner_id,next_followup_at,google_maps_url,first_contact_message,notes,created_at,updated_at";

export type OrdenarPor = "created_at" | "updated_at" | "estimated_value" | "name" | "city";

export interface FiltrosLeads {
  busca: string;
  responsavel: string; // "all" | "none" | id do usuário
  etapa: string; // "all" | "none" | id da etapa
  cidade: string;
  nicho: string;
  origem: string;
  contato: "all" | "com_whatsapp" | "sem_contato" | "nao_contatar";
  periodo: "all" | "7" | "30" | "90";
  ordenarPor: OrdenarPor;
  ordem: "asc" | "desc";
  // Recorte por lista de ids, usado pela busca de duplicados.
  ids: string[] | null;
}

export const FILTROS_PADRAO: FiltrosLeads = {
  busca: "",
  responsavel: "all",
  etapa: "all",
  cidade: "",
  nicho: "",
  origem: "",
  contato: "all",
  periodo: "all",
  ordenarPor: "created_at",
  ordem: "desc",
  ids: null,
};

// PostgREST usa vírgula e parênteses como separadores: limpamos para não quebrar o filtro.
const textoSeguro = (valor: string) =>
  valor.trim().replace(/[,()*%\\]/g, " ").replace(/\s+/g, " ").slice(0, 80);

const diasAtras = (dias: number) =>
  new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();

type Consulta = ReturnType<ReturnType<typeof supabase.from>["select"]>;

// Aplica o recorte de permissão: quem não é gestor enxerga apenas os próprios leads.
export function aplicarEscopo<T extends Consulta>(
  consulta: T,
  gestor: boolean,
  usuarioId?: string,
): T {
  if (gestor) return consulta;
  return consulta.eq("owner_id", usuarioId ?? "") as T;
}

export function aplicarFiltros<T extends Consulta>(consulta: T, filtros: FiltrosLeads): T {
  let atual = consulta;

  if (filtros.ids?.length) atual = atual.in("id", filtros.ids) as T;

  const busca = textoSeguro(filtros.busca);
  if (busca) {
    atual = atual.or(
      [
        `name.ilike.%${busca}%`,
        `company.ilike.%${busca}%`,
        `email.ilike.%${busca}%`,
        `phone.ilike.%${busca}%`,
        `whatsapp.ilike.%${busca}%`,
      ].join(","),
    ) as T;
  }

  if (filtros.responsavel === "none") atual = atual.is("owner_id", null) as T;
  else if (filtros.responsavel !== "all") atual = atual.eq("owner_id", filtros.responsavel) as T;

  if (filtros.etapa === "none") atual = atual.is("stage_id", null) as T;
  else if (filtros.etapa !== "all") atual = atual.eq("stage_id", filtros.etapa) as T;

  const cidade = textoSeguro(filtros.cidade);
  if (cidade) atual = atual.ilike("city", `%${cidade}%`) as T;

  const nicho = textoSeguro(filtros.nicho);
  if (nicho) atual = atual.ilike("niche", `%${nicho}%`) as T;

  const origem = textoSeguro(filtros.origem);
  if (origem) atual = atual.ilike("source", `%${origem}%`) as T;

  if (filtros.contato === "com_whatsapp") atual = atual.not("whatsapp", "is", null) as T;
  else if (filtros.contato === "sem_contato")
    atual = atual.is("whatsapp", null).is("phone", null) as T;
  else if (filtros.contato === "nao_contatar")
    atual = atual.eq("whatsapp_do_not_contact", true) as T;

  if (filtros.periodo !== "all")
    atual = atual.gte("created_at", diasAtras(Number(filtros.periodo))) as T;

  return atual;
}

// Uma página da tabela, já com o total do filtro para a paginação.
export async function buscarPagina(
  filtros: FiltrosLeads,
  pagina: number,
  porPagina: number,
  gestor: boolean,
  usuarioId?: string,
) {
  const inicio = pagina * porPagina;
  let consulta = supabase.from("leads").select(COLUNAS_LISTA, { count: "exact" });
  consulta = aplicarEscopo(consulta, gestor, usuarioId);
  consulta = aplicarFiltros(consulta, filtros);
  const { data, count, error } = await consulta
    .order(filtros.ordenarPor, { ascending: filtros.ordem === "asc", nullsFirst: false })
    .range(inicio, inicio + porPagina - 1);
  if (error) throw error;
  return { leads: (data ?? []) as unknown as LeadLista[], total: count ?? 0 };
}

// Contagens do painel de triagem: só o número, sem trazer as linhas.
export async function contarTriagem(gestor: boolean, usuarioId?: string) {
  const contar = async (preparar: (consulta: Consulta) => Consulta) => {
    const base = supabase.from("leads").select("id", { count: "exact", head: true });
    const { count, error } = await preparar(aplicarEscopo(base, gestor, usuarioId));
    if (error) throw error;
    return count ?? 0;
  };

  const [total, semResponsavel, semContato, semEtapa] = await Promise.all([
    contar((c) => c),
    contar((c) => c.is("owner_id", null)),
    contar((c) => c.is("whatsapp", null).is("phone", null)),
    contar((c) => c.is("stage_id", null)),
  ]);

  return { total, semResponsavel, semContato, semEtapa };
}

// Varre o filtro atual em blocos, para exportação e busca de duplicados.
export async function varrerFiltro<T>(
  filtros: FiltrosLeads,
  colunas: string,
  gestor: boolean,
  usuarioId: string | undefined,
  limite = 10_000,
): Promise<T[]> {
  const bloco = 1000;
  const linhas: T[] = [];
  for (let inicio = 0; inicio < limite; inicio += bloco) {
    let consulta = supabase.from("leads").select(colunas);
    consulta = aplicarEscopo(consulta, gestor, usuarioId);
    consulta = aplicarFiltros(consulta, filtros);
    const { data, error } = await consulta
      .order("created_at", { ascending: true })
      .range(inicio, inicio + bloco - 1);
    if (error) throw error;
    const pagina = (data ?? []) as unknown as T[];
    linhas.push(...pagina);
    if (pagina.length < bloco) break;
  }
  return linhas;
}
