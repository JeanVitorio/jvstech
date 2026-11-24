import type { LeadLista } from "./leadsQuery";

const CABECALHO = [
  "Nome",
  "Empresa",
  "E-mail",
  "Telefone",
  "WhatsApp",
  "Cidade",
  "Nicho",
  "Origem",
  "Valor estimado",
  "Etapa",
  "Responsável",
  "Não contatar",
  "Criado em",
];

// Planilhas executam células iniciadas por = + - @: neutralizamos antes de exportar.
function celulaSegura(valor: unknown) {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  const protegido = /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
  return `"${protegido.replace(/"/g, '""')}"`;
}

export function montarCsv(
  leads: LeadLista[],
  nomeEtapa: (id?: string | null) => string,
  nomeResponsavel: (id?: string | null) => string,
) {
  const linhas = leads.map((lead) =>
    [
      lead.name,
      lead.company,
      lead.email,
      lead.phone,
      lead.whatsapp,
      lead.city,
      lead.niche,
      lead.source,
      lead.estimated_value ?? 0,
      nomeEtapa(lead.stage_id),
      nomeResponsavel(lead.owner_id),
      lead.whatsapp_do_not_contact ? "sim" : "não",
      new Date(lead.created_at).toLocaleString("pt-BR"),
    ]
      .map(celulaSegura)
      .join(";"),
  );
  return [CABECALHO.map(celulaSegura).join(";"), ...linhas].join("\r\n");
}

export function baixarCsv(conteudo: string, nomeArquivo: string) {
  // BOM para o Excel abrir os acentos corretamente.
  const blob = new Blob([`\ufeff${conteudo}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const ancora = document.createElement("a");
  ancora.href = url;
  ancora.download = nomeArquivo;
  document.body.appendChild(ancora);
  ancora.click();
  document.body.removeChild(ancora);
  URL.revokeObjectURL(url);
}
