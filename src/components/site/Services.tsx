import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const plans = [
  {
    title: "Prospecção automatizada",
    desc: "Defina o perfil ideal de empresa e deixe os bots buscarem novas oportunidades para sua equipe.",
    marks: [
      "Filtros por segmento e localização",
      "Execução contínua no aplicativo",
      "Leads enviados direto para o painel",
    ],
  },
  {
    title: "Gestão de leads",
    desc: "Centralize os contatos encontrados e mantenha as informações comerciais acessíveis para a equipe.",
    marks: [
      "Dados organizados em um só lugar",
      "Responsável definido por lead",
      "Histórico da operação comercial",
    ],
  },
  {
    title: "Funil de vendas",
    desc: "Acompanhe cada oportunidade desde o primeiro contato até o fechamento sem depender de planilhas.",
    marks: [
      "Etapas comerciais visuais",
      "Movimentação simples entre fases",
      "Visão clara das negociações",
    ],
  },
  {
    title: "Bots de WhatsApp",
    desc: "Apoie o primeiro contato com mensagens organizadas e uma operação integrada à prospecção.",
    marks: [
      "Configuração por nicho",
      "Agenda semanal de execução",
      "Acompanhamento pelo painel",
    ],
  },
  {
    title: "Equipe e permissões",
    desc: "Distribua oportunidades entre colaboradores e mantenha cada usuário com o acesso adequado.",
    marks: [
      "Perfis de acesso por função",
      "Gestão centralizada pelo líder",
      "Distribuição de leads por responsável",
    ],
    cta: "Acessar a plataforma →",
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
            ◆ Recursos
          </p>

          <h2 className="mx-auto mt-4 max-w-2xl font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl">
            Tudo o que sua prospecção precisa{" "}
            <span className="text-brand">
              em um único fluxo.
            </span>
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-[0.8rem] leading-relaxed text-muted-foreground md:text-sm">
            Da busca por empresas ao acompanhamento das oportunidades,
            o JVS LeadFlow conecta automação, dados e equipe comercial.
          </p>
        </div>

        {/* Cards */}
        <div className="svc-grid mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <article
              key={p.title}
              className="svc-card glass-card group relative flex flex-col overflow-hidden rounded-2xl border border-primary/25 p-6 shadow-[0_20px_60px_-40px_rgb(255_101_0_/_75%)] transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-[var(--glow-ice)] md:p-7"
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
                  href="/LeadFlow/login"
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