import { useMemo, useState } from "react";
import { ArrowUpRight, LayoutGrid, MessageCircle, Search, SearchX, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { SUPPORT_WHATSAPP_URL, faqCategories, faqItems } from "@/data/faq";
import { cn } from "@/lib/utils";

const ALL = "all";

// Ignora acentos e maiúsculas na busca ("instalacao" encontra "instalação").
const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function Faq() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);

  const results = useMemo(() => {
    const term = normalize(query.trim());
    return faqItems.filter(
      (item) =>
        (category === ALL || item.category === category) &&
        (!term || normalize(`${item.question} ${item.answer}`).includes(term)),
    );
  }, [query, category]);

  const grouped = faqCategories
    .map((group) => ({ ...group, items: results.filter((item) => item.category === group.id) }))
    .filter((group) => group.items.length > 0);

  const chips = [{ id: ALL, label: "Todas", icon: LayoutGrid }, ...faqCategories];

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <PageHeader
        title="Dúvidas"
        subtitle="Respostas rápidas para as perguntas mais comuns sobre o LeadFlow."
      />

      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Busque por instalação, agentes, planos..."
          aria-label="Buscar dúvidas"
          className="h-14 w-full rounded-2xl border border-border/70 bg-card/80 pl-14 pr-12 text-base shadow-elegant outline-none backdrop-blur-xl transition placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-4 focus:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpar busca"
            className="absolute right-4 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-muted text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="-mx-1 mb-8 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Categorias">
        {chips.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={category === id}
            onClick={() => setCategory(id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
              category === id
                ? "border-primary/40 bg-primary text-primary-foreground shadow-glow"
                : "border-border/70 bg-card/60 text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <div className="premium-panel rounded-3xl p-10 text-center">
          <SearchX className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-display font-semibold">Nenhuma resposta encontrada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tente outras palavras ou fale com a gente pelo WhatsApp.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ id, label, icon: Icon, items }) => (
            <section key={id} aria-labelledby={`faq-${id}`}>
              <h2
                id={`faq-${id}`}
                className="mb-3 flex items-center gap-2 px-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-muted-foreground"
              >
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                {label}
              </h2>
              <Accordion
                type="single"
                collapsible
                className="premium-panel divide-y divide-border/60 overflow-hidden rounded-3xl"
              >
                {items.map((item) => (
                  <AccordionItem key={item.id} value={item.id} className="border-0 px-5">
                    <AccordionTrigger className="gap-4 py-4 text-left text-[0.95rem] font-semibold hover:no-underline [&>svg]:text-primary">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 pr-8 text-sm leading-relaxed text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>
      )}

      <section className="relative mt-10 overflow-hidden rounded-[2rem] border border-border/70 p-6 shadow-elegant sm:p-8">
        <div className="pointer-events-none absolute inset-0 gradient-glow opacity-60" />
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[1.2rem] bg-[#25d366] text-white shadow-[0_12px_30px_-10px_#25d366]">
            <MessageCircle className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold">Ainda com dúvida?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Fale direto com a equipe da JVS Tech pelo WhatsApp e a gente te ajuda.
            </p>
          </div>
          <Button
            asChild
            className="h-12 w-full gap-2 rounded-2xl bg-[#25d366] px-6 font-semibold text-white hover:bg-[#1fb857] sm:w-auto"
          >
            <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              Falar no WhatsApp
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
