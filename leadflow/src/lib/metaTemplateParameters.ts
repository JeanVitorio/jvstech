import type { MetaTemplateParameter } from "@/types/messageBots";

export const META_TEMPLATE_PARAMETERS: MetaTemplateParameter[] = [
  "nome",
  "empresa",
  "nicho",
];

export function isMetaTemplateParameter(
  value: string,
): value is MetaTemplateParameter {
  return META_TEMPLATE_PARAMETERS.includes(value as MetaTemplateParameter);
}

export function parseMetaTemplateParameters(
  value: string,
): MetaTemplateParameter[] {
  const parameters = value
    .split(",")
    .map((item) => item.trim().toLocaleLowerCase("pt-BR"))
    .filter(Boolean);
  const invalid = parameters.find((item) => !isMetaTemplateParameter(item));
  if (invalid) {
    throw new Error(
      `Parâmetro "${invalid}" inválido. Use somente nome, empresa ou nicho.`,
    );
  }
  return parameters as MetaTemplateParameter[];
}

export function validateMetaTemplateParameters(
  parameters: string[],
): parameters is MetaTemplateParameter[] {
  return parameters.every(isMetaTemplateParameter);
}
