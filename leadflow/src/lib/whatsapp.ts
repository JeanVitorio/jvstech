export const DEFAULT_FIRST_CONTACT_MESSAGE = "Olá, tudo bem com você?";

export function normalizeBrazilianPhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("0") && [11, 12].includes(digits.length)) {
    digits = digits.slice(1);
  }
  if ([10, 11].includes(digits.length)) {
    digits = `55${digits}`;
  }

  return digits;
}

// Aceita celular (9 + 8 dígitos) ou fixo (8 dígitos iniciando em 2-5) com DDD válido.
const BRAZILIAN_WHATSAPP_PATTERN = /^55[1-9][1-9](9\d{8}|[2-5]\d{7})$/;

export function isValidBrazilianWhatsapp(value?: string | null): boolean {
  if (!value) return false;
  const digits = normalizeBrazilianPhone(value);
  return !!digits && BRAZILIAN_WHATSAPP_PATTERN.test(digits);
}

// Formata enquanto o usuário digita: (11) 99999-9999 ou (11) 4164-5358.
export function formatBrazilianPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  digits = digits.slice(0, 11);

  if (digits.length <= 2) return digits ? `(${digits}` : "";
  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);
  const split = local.length > 8 ? 5 : 4;
  if (local.length <= split) return `(${ddd}) ${local}`;
  return `(${ddd}) ${local.slice(0, split)}-${local.slice(split)}`;
}

export function whatsappWebLink(
  phone?: string | null,
  message = DEFAULT_FIRST_CONTACT_MESSAGE,
): string | null {
  if (!phone) return null;
  const normalizedPhone = normalizeBrazilianPhone(phone);
  if (!normalizedPhone) return null;
  const normalizedMessage = message.trim() || DEFAULT_FIRST_CONTACT_MESSAGE;

  return `https://web.whatsapp.com/send?phone=${normalizedPhone}&text=${encodeURIComponent(normalizedMessage)}`;
}
