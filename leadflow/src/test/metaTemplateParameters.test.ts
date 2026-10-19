import { describe, expect, it } from "vitest";
import {
  parseMetaTemplateParameters,
  validateMetaTemplateParameters,
} from "@/lib/metaTemplateParameters";

describe("parâmetros de template Meta", () => {
  it("preserva a ordem informada e normaliza os valores", () => {
    expect(parseMetaTemplateParameters(" Empresa, nome, NICHO ")).toEqual([
      "empresa",
      "nome",
      "nicho",
    ]);
  });

  it("permite uma lista vazia para templates sem parâmetros", () => {
    expect(parseMetaTemplateParameters("  ")).toEqual([]);
  });

  it("rejeita parâmetros fora da lista segura", () => {
    expect(() => parseMetaTemplateParameters("nome,telefone")).toThrow(
      'Parâmetro "telefone" inválido',
    );
  });

  it("valida somente nome, empresa e nicho", () => {
    expect(validateMetaTemplateParameters(["nome", "empresa"])).toBe(true);
    expect(validateMetaTemplateParameters(["nome", "email"])).toBe(false);
  });
});
