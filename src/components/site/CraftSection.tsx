import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const offers = [
  {
    tag: "Isca certeira",
    title: "Landing Pages",
    body: "Uma página, uma presa. Copy que morde, carregamento abaixo de 1s e teste A/B pronto no dia da entrega.",
    marks: ["Copy persuasiva", "<1s de carregamento", "Pronta para A/B"],
  },
  {
    tag: "Território",
    title: "Sites Institucionais",
    body: "Autoridade que se sente na primeira rolagem. Estrutura de SEO no osso e conteúdo que trabalha por você.",
    marks: ["Design exclusivo", "SEO estrutural", "Blog integrado"],
  },
  {
    tag: "Instinto",
    title: "Sistemas Web",
    body: "Painéis sob medida que substituem planilhas, gambiarras e retrabalho. Sua operação enfim escalando.",
    marks: ["Painel admin", "Banco de dados", "APIs integradas"],
  },
  {
    tag: "Faro",
    title: "Automações",
    body: "Atendimento, qualificação e follow-up rodando sozinhos. Você dorme, a matilha continua caçando.",
    marks: ["Atendimento 24/7", "Qualificação de leads", "Integrações"],
  },
];

export function CraftSection() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from(".craft-head > *", {
        y: 40,
        opacity: 0,
        stagger: 0.1,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: ".craft-head", start: "top 80%" },
      });
      gsap.from(".craft-card", {
        y: 70,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: ".craft-grid", start: "top 78%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="matilha" ref={root} className="relative overflow-hidden py-24 md:py-32">
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-accent/10 blur-[120px]" />
      <div className="mx-auto max-w-6xl px-6">
        <div className="craft-head max-w-2xl">
          <p className="rune text-[0.65rem] text-primary">◆ O arsenal</p>
          <h2 className="mt-4 font-display text-3xl leading-tight md:text-5xl">
            Quatro formas de <span className="text-pelt">morder</span> o mercado
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Nada de template reaproveitado. Cada projeto nasce do zero, moldado ao seu
            modelo de negócio e afiado para um único objetivo: receita.
          </p>
        </div>

        <div className="craft-grid mt-14 grid gap-5 md:grid-cols-2">
          {offers.map((o) => (
            <article
              key={o.title}
              className="craft-card group relative overflow-hidden rounded-sm border border-border bg-card p-8 transition-colors hover:border-primary/60"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[var(--gradient-pelt)] opacity-0 transition-opacity group-hover:opacity-100" />
              <p className="rune text-[0.6rem] text-accent">{o.tag}</p>
              <h3 className="mt-3 font-display text-2xl">{o.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{o.body}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {o.marks.map((m) => (
                  <li
                    key={m}
                    className="rounded-full border border-border px-3 py-1 text-[0.65rem] text-foreground/70"
                  >
                    {m}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
