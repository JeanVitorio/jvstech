import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const plans = [
  {
    title: "Site Institucional",
    desc: "Para o negócio que quer ser encontrado no Google e transmitir credibilidade aos seus clientes.",
    marks: [
      "Design exclusivo e adaptado a mobile",
      "Otimizado para aparecer no Google",
      "Suporte incluído após o lançamento",
    ],
  },
  {
    title: "Soluções Personalizadas",
    desc: "Sistemas sob medida para quem precisa operar sem depender de planilha ou trabalho manual.",
    marks: [
      "Painel administrativo próprio",
      "Automação de processos internos",
      "Integrações com o que já usa",
    ],
  },
  {
    title: "E-commerce",
    desc: "Loja online pronta para vender a qualquer hora, com pagamento e stock sob controlo.",
    marks: [
      "Pagamentos integrados e seguros",
      "Gestão de produtos e stock",
      "Checkout pensado para converter",
    ],
  },
  {
    title: "Landing Pages",
    desc: "Páginas de campanha focadas num único objetivo: transformar visitas em contactos.",
    marks: [
      "Estrutura pensada para gerar contactos",
      "Copy e ofertas testadas",
      "Relatório mensal de performance",
    ],
  },
  {
    title: "White Labels",
    desc: "Projetos prontos, já construídos e testados, disponíveis para a sua marca entrar e operar.",
    marks: [
      "Entrega muito mais rápida",
      "Personalizado com a sua identidade",
      "Catálogo disponível sob consulta",
    ],
    cta: "Ver White Labels disponíveis →",
  },
];

export function Services() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const section = root.current;

      if (!section) return;

      const head = section.querySelector<HTMLElement>(".svc-head");
      const cards = section.querySelectorAll<HTMLElement>(".svc-card");

      if (!head || cards.length === 0) return;

      /*
       * Garante que os elementos começam visíveis.
       * Isso evita que um problema no ScrollTrigger
       * deixe a seção inteira invisível.
       */
      gsap.set(head.children, {
        opacity: 1,
        y: 0,
      });

      gsap.set(cards, {
        opacity: 1,
        y: 0,
      });

      /*
       * Animação do cabeçalho
       */
      gsap.from(head.children, {
        y: 36,
        opacity: 0,
        stagger: 0.1,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: head,
          start: "top 85%",
          once: true,
        },
      });

      /*
       * Animação dos cards
       */
      gsap.from(cards, {
        y: 56,
        opacity: 0,
        stagger: 0.1,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: cards[0],
          start: "top 88%",
          once: true,
        },
      });

      /*
       * Recalcula as posições depois que a página
       * termina de carregar.
       */
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="servicos"
      ref={root}
      className="relative z-10 overflow-hidden py-20 md:py-32"
    >
      {/* Grid tecnológico */}
      <div className="tech-grid pointer-events-none absolute inset-0 z-0 opacity-50" />

      {/* Glow lateral */}
      <div className="pointer-events-none absolute -left-40 top-1/3 z-0 h-96 w-96 rounded-full bg-primary/10 blur-[130px]" />

      {/* Conteúdo */}
      <div className="relative z-10 mx-auto max-w-6xl px-5 md:px-6">
        {/* Cabeçalho */}
        <div className="glass-card svc-head relative overflow-hidden rounded-2xl px-6 py-10 text-center md:px-8 md:py-14">
          {/* Linha superior */}
          <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-1 w-32 rounded-full bg-brand md:w-40" />

          <p className="label-xs text-primary">
            ◆ Serviços
          </p>

          <h2 className="mx-auto mt-4 max-w-2xl font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl">
            Criação de sites profissionais{" "}
            <span className="text-brand">
              pensados para si.
            </span>
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-[0.8rem] leading-relaxed text-muted-foreground md:text-sm">
            Para negócios que querem marcar presença online —
            estudamos o seu mercado, os seus clientes e
            construímos algo pensado ao detalhe.
          </p>
        </div>

        {/* Cards */}
        <div className="svc-grid mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <article
              key={p.title}
              className="svc-card glass-card group relative flex flex-col overflow-hidden rounded-2xl border border-primary/25 p-6 shadow-[0_20px_60px_-40px_oklch(0.72_0.16_215_/_80%)] transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-[var(--glow-ice)] md:p-7"
            >
              {/* Glow do card */}
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl transition-opacity duration-500 group-hover:bg-primary/20" />

              {/* Linha superior */}
              <div className="absolute left-6 top-0 h-1 w-16 rounded-full bg-brand md:left-7" />

              {/* Título */}
              <h3 className="relative mt-4 font-display text-lg font-semibold md:text-xl">
                {p.title}
              </h3>

              {/* Descrição */}
              <p className="relative mt-3 text-[0.78rem] leading-relaxed text-muted-foreground md:text-xs">
                {p.desc}
              </p>

              {/* Benefícios */}
              <ul className="relative mt-5 space-y-2.5">
                {p.marks.map((m) => (
                  <li
                    key={m}
                    className="flex items-start gap-2 text-[0.78rem] text-muted-foreground md:text-xs"
                  >
                    <span className="mt-[3px] h-3 w-3 shrink-0 rounded-full bg-brand" />

                    <span>{m}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {p.cta && (
                <a
                  href="#orcamento"
                  className="relative mt-6 inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-[0.7rem] font-semibold text-primary-foreground shadow-[var(--glow-ice)] transition-transform hover:scale-[1.04]"
                >
                  {p.cta}
                </a>
              )}

              {/* Linha inferior animada */}
              <div className="absolute bottom-0 left-0 h-px w-0 bg-brand transition-all duration-500 group-hover:w-full" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}