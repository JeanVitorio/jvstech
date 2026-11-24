// Colunas mínimas para procurar repetidos sem pesar a consulta.
export const COLUNAS_DUPLICADOS = "id,name,city,phone,whatsapp,created_at";

export interface LeadDuplicado {
  id: string;
  name: string;
  city: string | null;
  phone: string | null;
  whatsapp: string | null;
  created_at: string;
}

export interface GrupoDuplicado {
  chave: string;
  motivo: "telefone" | "nome";
  manter: LeadDuplicado;
  repetidos: LeadDuplicado[];
}

// Dois números batem quando os 8 dígitos finais são iguais, ignorando DDI e máscara.
function chavePorTelefone(lead: LeadDuplicado) {
  const digitos = `${lead.whatsapp || lead.phone || ""}`.replace(/\D/g, "");
  return digitos.length >= 8 ? `tel:${digitos.slice(-8)}` : "";
}

function chavePorNome(lead: LeadDuplicado) {
  const nome = (lead.name || "").trim().toLowerCase();
  if (nome.length < 4) return "";
  return `nome:${nome}|${(lead.city || "").trim().toLowerCase()}`;
}

// Agrupa repetidos mantendo sempre o lead mais antigo de cada grupo.
export function agruparDuplicados(leads: LeadDuplicado[]): GrupoDuplicado[] {
  const porChave = new Map<string, LeadDuplicado[]>();
  const jaAgrupado = new Set<string>();

  const adicionar = (chave: string, lead: LeadDuplicado) => {
    if (!chave || jaAgrupado.has(lead.id)) return;
    const atual = porChave.get(chave) ?? [];
    atual.push(lead);
    porChave.set(chave, atual);
    jaAgrupado.add(lead.id);
  };

  // Telefone tem prioridade; o nome só agrupa quem sobrou.
  for (const lead of leads) adicionar(chavePorTelefone(lead), lead);
  for (const lead of leads) adicionar(chavePorNome(lead), lead);

  const grupos: GrupoDuplicado[] = [];
  for (const [chave, itens] of porChave) {
    if (itens.length < 2) continue;
    const ordenados = [...itens].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    grupos.push({
      chave,
      motivo: chave.startsWith("tel:") ? "telefone" : "nome",
      manter: ordenados[0],
      repetidos: ordenados.slice(1),
    });
  }
  return grupos.sort((a, b) => b.repetidos.length - a.repetidos.length);
}

export const idsParaDescartar = (grupos: GrupoDuplicado[]) =>
  grupos.flatMap((grupo) => grupo.repetidos.map((lead) => lead.id));
