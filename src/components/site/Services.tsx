import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const plans = [
  {
    title: "Site Institucional",
    desc: "Para o negócio que quer ser encontrado no Google e transmitir credibilidade aos seus clientes.",
    marks: ["Design exclusivo e adaptado a mobile", "Otimizado para aparecer no Google", "Suporte incluído após o lançamento"],
  },
  {
    title: "Site de conversão",
    desc: "Pensado para quem quer captar contactos qualificados e transformar visitas em clientes.",
    marks: ["Estrutura pensada para gerar contactos", "Copy e ofertas testadas", "Relatório mensal de performance"],
    featured: true,
  },
  {
    title: "Sistemas e Lojas",
    desc: "Para quem precisa vender ou operar sem depender de horário, planilha ou intervenção manual.",
    marks: ["Pagamentos integrados e seguros", "Painel administrativo próprio", "Automação de processos internos"],
  },
];

export function Services() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from(".svc-head > *", {
        y: 36,
        opacity: 0,
        stagger: 0.1,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: ".svc-head", start: "top 82%" },
      });
      gsap.from(".svc-card", {
        y: 64,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: ".svc-grid", start: "top 82%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="servicos" ref={root} className="relative overflow-hidden py-24 md:py-32">
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-primary/10 blur-[130px]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="glass-card svc-head relative overflow-hidden rounded-2xl px-8 py-14 text-center">
          <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-1 w-40 rounded-full bg-[var(--gradient-brand)]" />
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            Criação de sites profissionais <span className="text-brand">pensados para si.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Para negócios que querem marcar presença online — estudamos o seu mercado, os
            seus clientes e construímos algo pensado ao detalhe.
          </p>
        </div>

        <div className="svc-grid mt-6 grid gap-5 md:grid-cols-3">
          {plans.map((p) => (
            <article
              key={p.title}
              className={`svc-card group relative overflow-hidden rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 ${
                p.featured
                  ? "glass-card border-primary/40 shadow-[var(--glow-ice)]"
                  : "glass-card hover:border-primary/40"
              }`}
            >
              <div className="absolute left-7 top-0 h-1 w-16 rounded-full bg-[var(--gradient-brand)]" />
              <h3 className="mt-4 font-display text-xl font-semibold">{p.title}</h3>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground/80">Descrição: </span>
                {p.desc}
              </p>
              <ul className="mt-6 space-y-2.5">
                {p.marks.map((m) => (
                  <li key={m} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-[3px] h-3 w-3 shrink-0 rounded-full bg-[var(--gradient-brand)]" />
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
