export const DEFAULT_FIRST_CONTACT_MESSAGE = "Olá, tudo bem com você?";

function normalizeBrazilianPhone(value: string): string | null {
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
