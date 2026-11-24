import { describe, expect, it } from "vitest";
import {
  agruparDuplicados,
  idsParaDescartar,
  type LeadDuplicado,
} from "@/components/leads/leadsDuplicates";
import { montarCsv } from "@/components/leads/leadsExport";
import type { LeadLista } from "@/components/leads/leadsQuery";

const duplicado = (parcial: Partial<LeadDuplicado> & { id: string }): LeadDuplicado => ({
  name: "Empresa",
  city: null,
  phone: null,
  whatsapp: null,
  created_at: "2026-01-01T00:00:00.000Z",
  ...parcial,
});

describe("agruparDuplicados", () => {
  it("agrupa por telefone ignorando máscara e DDI", () => {
    const grupos = agruparDuplicados([
      duplicado({ id: "a", name: "Loja A", phone: "(41) 98765-4321", created_at: "2026-01-01T00:00:00.000Z" }),
      duplicado({ id: "b", name: "Loja B", whatsapp: "5541987654321", created_at: "2026-02-01T00:00:00.000Z" }),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].motivo).toBe("telefone");
    // O mais antigo é sempre preservado.
    expect(grupos[0].manter.id).toBe("a");
    expect(idsParaDescartar(grupos)).toEqual(["b"]);
  });

  it("agrupa por nome e cidade quando não há telefone", () => {
    const grupos = agruparDuplicados([
      duplicado({ id: "a", name: "Padaria Central", city: "Curitiba" }),
      duplicado({ id: "b", name: "padaria central", city: "curitiba", created_at: "2026-03-01T00:00:00.000Z" }),
      duplicado({ id: "c", name: "Padaria Central", city: "São Paulo" }),
    ]);
    expect(idsParaDescartar(grupos)).toEqual(["b"]);
  });

  it("não agrupa leads sem repetição", () => {
    const grupos = agruparDuplicados([
      duplicado({ id: "a", name: "Loja A", phone: "(41) 3333-1111" }),
      duplicado({ id: "b", name: "Loja B", phone: "(41) 3333-2222" }),
    ]);
    expect(grupos).toHaveLength(0);
  });
});

describe("montarCsv", () => {
  const lead = {
    id: "1",
    name: "=cmd|calc",
    company: 'Empresa "X"',
    email: null,
    phone: "4133331111",
    whatsapp: null,
    whatsapp_do_not_contact: false,
    city: "Curitiba",
    niche: "bebidas",
    source: null,
    estimated_value: 197,
    stage_id: "s1",
    owner_id: "u1",
    next_followup_at: null,
    google_maps_url: null,
    first_contact_message: null,
    notes: null,
    created_at: "2026-01-01T12:00:00.000Z",
    updated_at: "2026-01-01T12:00:00.000Z",
  } satisfies LeadLista;

  it("neutraliza fórmulas e escapa aspas", () => {
    const csv = montarCsv([lead], () => "Novo Lead", () => "João");
    const linha = csv.split("\r\n")[1];
    expect(linha.startsWith(`"'=cmd|calc"`)).toBe(true);
    expect(linha).toContain('"Empresa ""X"""');
    expect(linha).toContain('"Novo Lead"');
    expect(linha).toContain('"João"');
  });
});
