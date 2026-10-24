import type { ReactNode } from "react";
import logo from "@/assets/logo-jvs-wolf.webp";
import { SiteFooter } from "@/components/site/SiteFooter";
import { LEGAL_LINKS, LEGAL_UPDATED_AT } from "./company";

interface LegalPageProps {
  title: string;
  summary: string;
  children: ReactNode;
}

// Estrutura comum das páginas jurídicas: cabeçalho, sumário, conteúdo e rodapé.
export function LegalPage({ title, summary, children }: LegalPageProps) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-5">
          <a href="/" className="flex items-center gap-2">
            <img src={logo} alt="" className="h-8 w-8 object-contain" />
            <span className="font-display text-sm font-semibold tracking-tight">
              JVS <span className="text-brand">LeadFlow</span>
            </span>
          </a>
          <a href="/" className="text-xs font-medium text-foreground/80 hover:text-primary">
            ← Voltar ao site
          </a>
        </div>
      </header>

      <main id="conteudo" className="mx-auto max-w-4xl px-6 py-14">
        <p className="label-xs text-primary">Documento legal</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Última atualização: {LEGAL_UPDATED_AT}</p>
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-foreground/85">{summary}</p>

        <nav aria-label="Outros documentos" className="mt-8 flex flex-wrap gap-2">
          {LEGAL_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full border border-border px-4 py-2 text-xs text-foreground/85 transition-colors hover:border-primary hover:text-primary"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="mt-12 space-y-10">{children}</div>
      </main>

      <SiteFooter />
    </div>
  );
}

// Seção numerada de um documento jurídico.
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 text-sm leading-relaxed text-foreground/85">
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

// Lista com marcadores no padrão visual das páginas jurídicas.
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-primary">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
