import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import cima from "@/assets/caminhando_de_cima.mp4";

const blocks = [
  {
    tag: "O que trava",
    body: "Site bonito que não vende. Formulário que ninguém preenche. Orçamento que se perde no WhatsApp. Planilha a segurar a operação inteira.",
  },
  {
    tag: "O que custa",
    body: "Cada mês parado é receita entregue ao concorrente que respondeu primeiro e apareceu melhor na pesquisa.",
  },
  {
    tag: "O que fazemos",
    body: "Reescrevemos a oferta, encurtamos o caminho até a compra e automatizamos o que consome o seu tempo.",
  },
  {
    tag: "O que fica",
    body: "Um ativo que trabalha 24h, mede tudo e melhora todos os meses. Previsível, rastreável e seu.",
  },
];

export function Overhead() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const section = root.current;

      if (!section) return;

      const video = section.querySelector<HTMLElement>(".over-video");
      const title = section.querySelectorAll<HTMLElement>(".over-title");
      const blocks = section.querySelectorAll<HTMLElement>(".over-block");
      const grid = section.querySelector<HTMLElement>(".over-grid");

      /*
       * Movimento lateral suave do lobo conforme o scroll.
       */
      if (video) {
        gsap.fromTo(
          video,
          { xPercent: -4 },
          {
            xPercent: 4,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      }

      /*
       * Animação do título.
       */
      if (title.length) {
        gsap.from(title, {
          y: 40,
          opacity: 0,
          stagger: 0.08,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 75%",
            once: true,
          },
        });
      }

      /*
       * Animação dos cards.
       */
      if (blocks.length && grid) {
        gsap.from(blocks, {
          y: 50,
          opacity: 0,
          stagger: 0.12,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: grid,
            start: "top 88%",
            once: true,
          },
        });
      }

      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative overflow-hidden py-20 md:py-24"
    >
      {/* Grid tecnológico */}
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-40" />

      {/* ========================================================= */}
      {/* TÍTULO */}
      {/* ========================================================= */}

      <div className="relative z-10 mx-auto max-w-6xl px-5 md:px-6">
        <p className="over-title label-xs text-center text-primary">
          ◆ Diagnóstico
        </p>

        <h2 className="over-title mx-auto mt-4 max-w-3xl text-center font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-5xl">
          O problema nunca é o site.
          <br />
          <span className="text-brand">
            É o caminho até a venda.
          </span>
        </h2>
      </div>

      {/* ========================================================= */}
      {/* VÍDEO + CARDS */}
      {/* ========================================================= */}

      <div className="relative z-10 mx-auto mt-10 max-w-7xl px-5 md:mt-14 md:px-6">
        <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
          
          {/* ===================================================== */}
          {/* LOBO */}
          {/* ===================================================== */}

          <div className="relative flex items-center justify-center overflow-hidden">
            <video
              className="over-video block h-auto w-full max-w-[620px] object-contain"
              src={cima}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />

            {/* Fade lateral */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,var(--background)_0%,transparent_12%,transparent_88%,var(--background)_100%)]" />

            {/* Fade inferior */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(to_top,var(--background),transparent)]" />
          </div>

          {/* ===================================================== */}
          {/* CARDS */}
          {/* ===================================================== */}

          <div className="over-grid grid gap-4 sm:grid-cols-2 lg:gap-5">
            {blocks.map((b) => (
              <div
                key={b.tag}
                className="over-block glass-card group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 md:p-6"
              >
                {/* Glow */}
                <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-primary/10 blur-3xl transition-opacity duration-500 group-hover:bg-primary/20" />

                {/* Linha superior */}
                <div className="absolute left-0 top-0 h-1 w-12 rounded-full bg-brand transition-all duration-500 group-hover:w-20" />

                <p className="relative label-xs text-primary">
                  {b.tag}
                </p>

                <p className="relative mt-3 text-[0.78rem] leading-relaxed text-muted-foreground md:text-xs">
                  {b.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* INDICADORES — MANTIDOS ABAIXO */}
      {/* ========================================================= */}

      <div className="relative z-10 mx-auto mt-12 max-w-6xl px-5 md:px-6">
        <div className="grid grid-cols-2 gap-6 border-t border-border pt-10 md:grid-cols-4">
          {[
            ["+40", "projetos entregues"],
            ["8 anos", "de estrada"],
            ["+92%", "de venda no melhor caso"],
            ["2h", "tempo médio de resposta"],
          ].map(([a, b]) => (
            <div key={b}>
              <p className="font-display text-2xl font-semibold text-brand md:text-3xl">
                {a}
              </p>

              <p className="mt-1 text-[0.7rem] text-muted-foreground">
                {b}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}