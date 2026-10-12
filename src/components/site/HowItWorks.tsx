import { Bot, Database, Search, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Search,
    number: "01",
    title: "Defina quem você procura",
    description: "Escolha o nicho e as cidades onde deseja encontrar novas empresas.",
  },
  {
    icon: Bot,
    number: "02",
    title: "Ative sua prospecção",
    description: "O LeadFlow pesquisa os contatos e organiza os dados encontrados para você.",
  },
  {
    icon: Database,
    number: "03",
    title: "Receba tudo no painel",
    description: "Telefone, site, e-mail e Instagram ficam centralizados sempre que disponíveis.",
  },
  {
    icon: TrendingUp,
    number: "04",
    title: "Transforme contatos em vendas",
    description:
      "Distribua os leads, acompanhe cada etapa e mantenha o foco nas melhores oportunidades.",
  },
];

export function HowItWorks() {
  return (
    <section id="metodo" className="relative overflow-hidden bg-background py-20 md:py-28">
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-35" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[140px]" />

      <div className="relative mx-auto max-w-6xl px-5 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="label-xs text-primary">◆ Simples desde o primeiro lead</p>
          <h2 className="mt-4 font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl">
            Da busca ao acompanhamento em <span className="text-brand">quatro passos claros.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Sem planilhas espalhadas e sem processos difíceis. Você configura a prospecção, recebe
            os contatos e acompanha as oportunidades.
          </p>
        </div>

        <div className="relative mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="pointer-events-none absolute left-[10%] right-[10%] top-12 hidden h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent lg:block" />
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <article
                key={step.number}
                className="glass-card group relative rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 md:p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand shadow-[var(--glow-ice)]">
                    <Icon className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
                  </span>
                  <span className="font-display text-3xl font-bold text-primary/25">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 text-center">
          <a
            href="/LeadFlow/signup?plan=free"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-8 py-3 text-sm font-bold text-primary-foreground shadow-[var(--glow-ice)] transition-transform hover:scale-[1.03]"
          >
            Criar conta grátis e gerar meus leads →
          </a>
          <p className="text-xs text-muted-foreground">
            50 leads por mês no plano Free. Sem cartão de crédito.
          </p>
        </div>
      </div>
    </section>
  );
}
