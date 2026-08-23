import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const tiers = [
  {
    name: "Base",
    price: "R$ 249",
    per: "/mês",
    tagline: "Tranquilidade técnica",
    desc: "Para quem quer o site sempre a funcionar, sem se preocupar com nada.",
    marks: [
      "Manutenção técnica contínua",
      "Relatório mensal de performance",
      "Pequenas alterações no site",
      "Suporte direto via WhatsApp",
    ],
  },
  {
    name: "Posicionamento",
    price: "R$ 449",
    per: "/mês",
    tagline: "Crescimento acompanhado",
    desc: "Para quem quer crescer online e aparecer antes da concorrência.",
    marks: [
      "Tudo o que está no plano Base",
      "Estudo do mercado e dos concorrentes",
      "Otimização para as pesquisas dos clientes",
      "Reunião mensal de análise e ajuste",
    ],
    featured: true,
  },
];

export function Pricing() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from(".price-card", {
        y: 70,
        opacity: 0,
        stagger: 0.16,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: ".price-grid", start: "top 88%" },
      });
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
    <section id="planos" ref={root} className="relative overflow-hidden py-20 md:py-32">
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="price-aura pointer-events-none absolute left-1/2 top-1/3 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/10 opacity-50 blur-[150px]" />

      <div className="relative mx-auto max-w-5xl px-5 text-center md:px-6">
        <p className="label-xs text-primary">◆ Planos de acompanhamento</p>
        <h2 className="mx-auto mt-4 max-w-2xl font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl">
          E depois do site estar pronto? <span className="text-brand">Ficamos consigo.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[0.82rem] leading-relaxed text-muted-foreground md:text-sm">
          Manter um site pode parecer um desafio — por isso tratamos disso por si, para que
          se foque no que realmente importa: o seu negócio.
        </p>

        <div className="price-grid mt-12 grid gap-5 text-left md:mt-14 md:grid-cols-2 md:gap-6">
          {tiers.map((t) => (
            <article
              key={t.name}
              className={`price-card group relative overflow-hidden rounded-3xl p-7 transition-transform duration-500 hover:-translate-y-2 md:p-9 ${
                t.featured
                  ? "border border-primary/60 bg-[linear-gradient(165deg,oklch(0.28_0.08_235_/_95%),oklch(0.16_0.03_240_/_95%))] shadow-[var(--glow-ice)]"
                  : "glass-card border-primary/25"
              }`}
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-primary/15 blur-3xl" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-brand opacity-80" />

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold">{t.name}</p>
                  <p className="label-xs mt-1 text-primary">{t.tagline}</p>
                </div>
                {t.featured ? (
                  <span className="shrink-0 rounded-full bg-brand px-3 py-1 text-[0.6rem] font-semibold text-primary-foreground">
                    mais escolhido
                  </span>
                ) : null}
              </div>

              <p className="mt-6 font-display text-4xl font-bold tracking-tight md:text-5xl">
                {t.price}
                <span className="text-base font-medium text-foreground/60">{t.per}</span>
              </p>
              <p className="mt-3 text-[0.8rem] leading-relaxed text-foreground/70 md:text-xs">{t.desc}</p>

              <div className="my-6 h-px w-full bg-border" />

              <ul className="space-y-3">
                {t.marks.map((m) => (
                  <li key={m} className="flex items-start gap-3 text-[0.8rem] text-foreground/85 md:text-xs">
                    <span className="mt-[1px] grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand text-[0.55rem] font-bold text-primary-foreground">
                      ✓
                    </span>
                    {m}
                  </li>
                ))}
              </ul>

              <a
                href="#orcamento"
                className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-[0.72rem] font-semibold transition-transform hover:scale-[1.03] ${
                  t.featured
                    ? "bg-brand text-primary-foreground shadow-[var(--glow-ice)]"
                    : "border border-border text-foreground/85 hover:border-primary hover:text-primary"
                }`}
              >
                Quero o plano {t.name} →
              </a>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-xl text-[0.72rem] text-muted-foreground md:text-xs">
          Todos os projetos incluem o primeiro mês do plano Base{" "}
          <strong className="text-foreground/80">sem custos</strong>. Depois desse período,
          continua apenas se fizer sentido para si.
        </p>
      </div>
    </section>
  );
}
