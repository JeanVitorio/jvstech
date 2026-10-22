import { describe, expect, it } from "vitest";
import {
  DEFAULT_FIRST_CONTACT_MESSAGE,
  formatBrazilianPhoneInput,
  isValidBrazilianWhatsapp,
  whatsappWebLink,
} from "@/lib/whatsapp";

describe("isValidBrazilianWhatsapp", () => {
  it("aceita celular e fixo com DDD, com ou sem +55", () => {
    expect(isValidBrazilianWhatsapp("(66) 99725-4944")).toBe(true);
    expect(isValidBrazilianWhatsapp("+55 11 4164-5358")).toBe(true);
    expect(isValidBrazilianWhatsapp("5566997254944")).toBe(true);
  });

  it("recusa números incompletos, DDD inválido ou vazio", () => {
    expect(isValidBrazilianWhatsapp("99725-4944")).toBe(false);
    expect(isValidBrazilianWhatsapp("(01) 99725-4944")).toBe(false);
    expect(isValidBrazilianWhatsapp("(66) 89725-4944")).toBe(false);
    expect(isValidBrazilianWhatsapp("")).toBe(false);
    expect(isValidBrazilianWhatsapp(null)).toBe(false);
  });
});

describe("formatBrazilianPhoneInput", () => {
  it("aplica a máscara de celular e de fixo", () => {
    expect(formatBrazilianPhoneInput("66997254944")).toBe("(66) 99725-4944");
    expect(formatBrazilianPhoneInput("1141645358")).toBe("(11) 4164-5358");
    expect(formatBrazilianPhoneInput("+55 66 99725-4944")).toBe("(66) 99725-4944");
    expect(formatBrazilianPhoneInput("669")).toBe("(66) 9");
    expect(formatBrazilianPhoneInput("")).toBe("");
  });
});

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
