import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const tiers = [
  {
    name: "Base",
    price: "R$ 249",
    per: "/mês",
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
        y: 60,
        opacity: 0,
        stagger: 0.14,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: ".price-grid", start: "top 82%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="planos" ref={root} className="relative overflow-hidden py-24 md:py-32">
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
          E depois do site estar pronto? <span className="text-brand">Ficamos consigo.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Manter um site pode parecer um desafio — por isso tratamos disso por si, para que
          se foque no que realmente importa: o seu negócio.
        </p>

        <div className="price-grid mt-14 grid gap-6 text-left md:grid-cols-2">
          {tiers.map((t) => (
            <article
              key={t.name}
              className={`price-card relative overflow-hidden rounded-2xl p-8 ${
                t.featured
                  ? "border border-primary/50 bg-[linear-gradient(160deg,oklch(0.42_0.13_225),oklch(0.34_0.12_195))] shadow-[var(--glow-ice)]"
                  : "glass-card"
              }`}
            >
              <div className="absolute left-8 top-0 h-1 w-20 rounded-full bg-[var(--gradient-brand)]" />
              <p className="mt-4 font-display text-lg font-semibold">{t.name}</p>
              <p className="mt-3 font-display text-4xl font-bold tracking-tight">
                {t.price}
                <span className="text-base font-medium text-foreground/70">{t.per}</span>
              </p>
              <p className="mt-3 text-xs leading-relaxed text-foreground/70">{t.desc}</p>
              <ul className="mt-6 space-y-2.5">
                {t.marks.map((m) => (
                  <li key={m} className="flex items-start gap-2 text-xs text-foreground/80">
                    <span className="mt-[3px] h-3 w-3 shrink-0 rounded-full bg-[var(--gradient-brand)]" />
                    {m}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-xl text-xs text-muted-foreground">
          Todos os projetos incluem o primeiro mês do plano Base <strong className="text-foreground/80">sem custos</strong>.
          Depois desse período, continua apenas se fizer sentido para si.
        </p>

        <a
          href="#orcamento"
          className="mt-8 inline-flex items-center rounded-full bg-[var(--gradient-brand)] px-8 py-4 text-xs font-semibold text-primary-foreground shadow-[var(--glow-ice)] transition-transform hover:scale-[1.04]"
        >
          Peça orientação gratuita, sem compromisso →
        </a>
      </div>
    </section>
  );
}
