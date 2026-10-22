import { useEffect, useRef } from "react";
import { ArrowRight, Check, Crown, Rocket, ShieldCheck, Sparkles, Zap } from "lucide-react";
import gsap from "gsap";

const tiers = [
  {
    code: "free",
    name: "LeadFlow Free",
    price: "Grátis",
    per: "",
    tagline: "Para começar",
    desc: "Crie sua conta e conheça o fluxo completo sem cadastrar cartão.",
    volume: "50",
    unitPrice: "sem custo",
    icon: Sparkles,
    marks: [
      "50 leads gerados por mês",
      "1 usuário: somente o Proprietário",
      "Gestão de leads e funil de vendas",
      "Agente de prospecção configurável",
      "Acesso pelo computador e celular",
    ],
  },
  {
    code: "basic",
    name: "LeadFlow Básico",
    price: "R$ 197",
    per: "/mês",
    tagline: "Operação essencial",
    desc: "Para iniciar uma rotina previsível de prospecção automatizada.",
    volume: "500",
    unitPrice: "R$ 0,39 por lead",
    icon: Zap,
    marks: [
      "500 leads gerados por mês",
      "2 usuários no total",
      "1 vaga para Administrador ou Usuário",
      "Gestão de leads e responsáveis",
      "Funil de vendas integrado",
      "Cobrança mensal recorrente",
    ],
  },
  {
    code: "plus",
    name: "LeadFlow Plus",
    price: "R$ 397",
    per: "/mês",
    tagline: "Para equipes em crescimento",
    desc: "Mais volume para acelerar a operação comercial da sua empresa.",
    volume: "1.500",
    unitPrice: "R$ 0,26 por lead",
    icon: Rocket,
    marks: [
      "1.500 leads gerados por mês",
      "5 usuários • até 2 Administradores",
      "Até 4 Usuários operacionais",
      "Gestão de equipe e responsáveis",
      "Agentes de prospecção e funil integrado",
      "Troca de plano e cartão online",
    ],
    featured: true,
  },
  {
    code: "pro",
    name: "LeadFlow Pro",
    price: "R$ 597",
    per: "/mês",
    tagline: "Máxima prospecção",
    desc: "Para operações que precisam gerar oportunidades em maior escala.",
    volume: "3.000",
    unitPrice: "R$ 0,20 por lead",
    icon: Crown,
    marks: [
      "3.000 leads gerados por mês",
      "10 usuários • até 3 Administradores",
      "Até 9 Usuários operacionais",
      "Todos os recursos do LeadFlow",
      "Operação centralizada por empresa",
      "Cancelamento online a qualquer momento",
    ],
  },
];

export function Pricing() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Os cards permanecem sempre visíveis, mesmo se animações forem bloqueadas.
      gsap.set(".price-card", { opacity: 1, y: 0 });
      gsap.to(".price-aura", {
        opacity: 0.9,
        scale: 1.15,
        duration: 3.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="planos" ref={root} className="relative overflow-hidden py-24 md:py-36">
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-25" />
      <div className="grain pointer-events-none absolute inset-0 opacity-25" />
      <div className="price-aura pointer-events-none absolute left-1/2 top-1/3 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-primary/15 opacity-50 blur-[170px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-5 text-center md:px-6">
        <span className="label-xs inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.08] px-4 py-2 text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Um plano para cada momento
        </span>
        <h2 className="mx-auto mt-6 max-w-4xl font-display text-3xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-4xl md:text-5xl">
          Escolha quantas oportunidades você quer{" "}
          <span className="text-brand">colocar no seu radar.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Comece sem risco no plano gratuito. Quando quiser acelerar, aumente o volume sem trocar de
          ferramenta, perder dados ou interromper sua operação.
        </p>

        <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-5 py-3 text-[0.68rem] text-foreground/55 backdrop-blur-xl">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Pagamento protegido pela Stripe
          </span>
          <span className="hidden h-3 w-px bg-border sm:block" />
          <span>Sem fidelidade</span>
          <span className="hidden h-3 w-px bg-border sm:block" />
          <span>Upgrade a qualquer momento</span>
        </div>

        <div className="price-grid mt-12 grid items-stretch gap-4 text-left md:mt-16 md:grid-cols-2 xl:grid-cols-4">
          {tiers.map((t) => {
            const Icon = t.icon;
            return (
              <article
                key={t.name}
                className={`price-card group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] p-6 transition-all duration-500 hover:-translate-y-2 md:p-7 ${
                  t.featured
                    ? "border border-primary/65 bg-[linear-gradient(155deg,rgb(255_101_0_/_16%),#121212_38%,#050505_100%)] shadow-[0_30px_100px_-32px_rgb(255_101_0_/_75%)] xl:-my-4 xl:py-11"
                    : "border border-white/[0.09] bg-[linear-gradient(165deg,rgb(24_24_24_/_94%),rgb(5_5_5_/_97%))] shadow-[0_28px_70px_-45px_rgb(0_0_0_/_95%)] hover:border-primary/45"
                }`}
              >
                <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-primary/15 blur-3xl transition-opacity group-hover:opacity-100" />
                <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

                {t.featured ? (
                  <span className="absolute right-5 top-5 rounded-full bg-brand px-3 py-1.5 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-primary-foreground shadow-[var(--glow-ice)]">
                    melhor escolha
                  </span>
                ) : null}

                <span
                  className={`relative grid h-11 w-11 place-items-center rounded-2xl ${
                    t.featured
                      ? "bg-brand shadow-[0_12px_35px_-12px_rgb(255_101_0_/_95%)]"
                      : "border border-primary/20 bg-primary/[0.08]"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${t.featured ? "text-primary-foreground" : "text-primary"}`}
                    aria-hidden="true"
                  />
                </span>

                <div className="relative mt-6">
                  <p className="font-display text-xl font-semibold">{t.name}</p>
                  <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-primary">
                    {t.tagline}
                  </p>
                </div>

                <p className="relative mt-6 font-display text-4xl font-bold tracking-[-0.04em]">
                  {t.price}
                  <span className="ml-1 text-sm font-medium tracking-normal text-foreground/45">
                    {t.per}
                  </span>
                </p>

                <div className="relative mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.035] p-4">
                  <p className="text-[0.62rem] uppercase tracking-[0.16em] text-foreground/40">
                    Capacidade mensal
                  </p>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <p className="font-display text-2xl font-semibold">{t.volume} leads</p>
                    <p className="pb-1 text-[0.62rem] text-primary">{t.unitPrice}</p>
                  </div>
                </div>

                <p className="relative mt-5 min-h-12 text-xs leading-relaxed text-foreground/60">
                  {t.desc}
                </p>

                <div className="relative my-6 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

                <ul className="relative flex-1 space-y-3.5">
                  {t.marks.map((m) => (
                    <li
                      key={m}
                      className="flex items-start gap-3 text-xs leading-relaxed text-foreground/80"
                    >
                      <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10">
                        <Check className="h-3 w-3 text-primary" aria-hidden="true" />
                      </span>
                      {m}
                    </li>
                  ))}
                </ul>

                <a
                  href={`/LeadFlow/signup?plan=${t.code}`}
                  className={`relative mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-xs font-bold transition-all hover:scale-[1.025] ${
                    t.featured
                      ? "bg-brand text-primary-foreground shadow-[var(--glow-ice)] hover:shadow-[0_0_75px_-10px_rgb(255_101_0_/_85%)]"
                      : "border border-white/10 bg-white/[0.035] text-foreground hover:border-primary/60 hover:bg-primary/[0.07] hover:text-primary"
                  }`}
                >
                  {t.code === "free"
                    ? "Começar sem pagar"
                    : `Escolher ${t.name.replace("LeadFlow ", "")}`}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </a>
              </article>
            );
          })}
        </div>

        <div className="mx-auto mt-12 flex max-w-3xl flex-col items-center justify-between gap-5 rounded-3xl border border-primary/25 bg-primary/[0.055] p-6 text-left backdrop-blur-xl sm:flex-row sm:px-8">
          <div>
            <p className="font-display text-lg font-semibold">Ainda quer experimentar primeiro?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              O plano Free libera 50 leads mensais. Sem cartão e sem compromisso.
            </p>
          </div>
          <a
            href="/LeadFlow/signup?plan=free"
            className="group inline-flex shrink-0 items-center gap-2 text-xs font-bold text-primary"
          >
            Criar conta gratuita
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </a>
        </div>
      </div>
    </section>
  );
}
