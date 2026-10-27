import logo from "@/assets/logo-jvs-wolf.webp";
import { COMPANY, LEGAL_LINKS } from "@/components/site/legal/company";
import { LeadFlowLink } from "@/components/site/LeadFlowLink";

// Links com "/" na frente para funcionarem também nas páginas jurídicas.
const navigation = [
  { href: "/#servicos", label: "Recursos" },
  { href: "/#metodo", label: "Como funciona" },
  { href: "/#resultados", label: "Benefícios" },
  { href: "/#planos", label: "Planos" },
  { href: "/#faq", label: "FAQ" },
  { href: "/LeadFlow/login", label: "Login" },
];

export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`relative z-10 mx-auto max-w-6xl px-6 pb-12 ${className}`}>
      <div className="grid gap-10 border-t border-border pt-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="h-8 w-8 object-contain" />
            <p className="font-display text-base font-semibold">
              JVS <span className="text-brand">LeadFlow</span>
            </p>
          </div>
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
            Prospecção automatizada, gestão de leads e funil de vendas em um único sistema.
          </p>
        </div>
        <nav aria-label="Navegação do site">
          <p className="label-xs text-muted-foreground">Navegação</p>
          <ul className="mt-4 space-y-2 text-xs text-foreground/80">
            {navigation.map((item) => (
              <li key={item.href}>
                {item.href.startsWith("/LeadFlow/") ? (
                  <LeadFlowLink className="hover:text-primary" href={item.href}>
                    {item.label}
                  </LeadFlowLink>
                ) : (
                  <a className="hover:text-primary" href={item.href}>
                    {item.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Documentos legais">
          <p className="label-xs text-muted-foreground">Legal</p>
          <ul className="mt-4 space-y-2 text-xs text-foreground/80">
            {LEGAL_LINKS.map((item) => (
              <li key={item.href}>
                <a className="hover:text-primary" href={item.href}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="label-xs text-muted-foreground">Contato</p>
          <ul className="mt-4 space-y-2 text-xs text-foreground/80">
            <li>
              <a className="hover:text-primary" href={COMPANY.whatsappUrl}>
                WhatsApp · {COMPANY.whatsapp}
              </a>
            </li>
            <li>
              <a className="break-all hover:text-primary" href={`mailto:${COMPANY.email}`}>
                {COMPANY.email}
              </a>
            </li>
            <li>Atendimento online · {COMPANY.city}</li>
          </ul>
        </div>
      </div>
      <div className="mt-10 space-y-1 text-[0.7rem] leading-relaxed text-muted-foreground">
        <p>
          {COMPANY.legalName} · CNPJ {COMPANY.cnpj} · {COMPANY.city}
        </p>
        <p>© 2026 {COMPANY.tradeName} · Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
