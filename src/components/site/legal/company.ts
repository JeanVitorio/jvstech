// Dados legais da empresa exibidos no rodapé e nas páginas jurídicas.
export const COMPANY = {
  legalName: "JVS SOLUCOES LTDA",
  tradeName: "JVS Soluções",
  cnpj: "64.379.006/0001-02",
  city: "Pato Branco - PR",
  email: "jeanvitoriosantosoliveira@gmail.com",
  whatsapp: "(46) 99116-3405",
  whatsappUrl: "https://wa.me/5546991163405",
  dpoName: "Jean Vitorio",
} as const;

// Data da versão vigente dos documentos (a mesma usada no aceite do app).
export const LEGAL_UPDATED_AT = "24 de outubro de 2026";

export const LEGAL_LINKS = [
  { href: "/termos", label: "Termos de Uso" },
  { href: "/privacidade", label: "Política de Privacidade" },
  { href: "/reembolso", label: "Reembolso e Cancelamento" },
  { href: "/cookies", label: "Política de Cookies" },
] as const;
