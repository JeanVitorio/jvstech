import { describe, expect, it } from "vitest";
import {
  DEFAULT_FIRST_CONTACT_MESSAGE,
  whatsappWebLink,
} from "@/lib/whatsapp";

describe("whatsappWebLink", () => {
  it("adiciona o código do Brasil e codifica a mensagem", () => {
    expect(whatsappWebLink("(66) 99725-4944")).toBe(
      `https://web.whatsapp.com/send?phone=5566997254944&text=${encodeURIComponent(DEFAULT_FIRST_CONTACT_MESSAGE)}`,
    );
  });

  it("preserva um número que já possui o código do Brasil", () => {
    expect(whatsappWebLink("+55 (66) 99725-4944", "Primeiro contato")).toBe(
      "https://web.whatsapp.com/send?phone=5566997254944&text=Primeiro%20contato",
    );
  });

  it("não cria link sem telefone", () => {
    expect(whatsappWebLink(null)).toBeNull();
  });
});
