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
      gsap.fromTo(
        ".over-video",
        { xPercent: -4 },
        {
          xPercent: 4,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
        },
      );
      gsap.from(".over-title", {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });
      gsap.from(".over-block", {
        y: 50,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: ".over-grid", start: "top 88%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative overflow-hidden py-20 md:py-24">
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative mx-auto max-w-6xl px-5 md:px-6">
        <p className="over-title label-xs text-center text-primary">◆ Diagnóstico</p>
        <h2 className="over-title mx-auto mt-4 max-w-3xl text-center font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-5xl">
          O problema nunca é o site.
          <br />
          <span className="text-brand">É o caminho até a venda.</span>
        </h2>
      </div>

      {/* overhead footage as a full-width corridor — never cropped, paws always visible */}
      <div className="relative mt-10 w-full md:mt-14">
        <video
          className="over-video wolf-video mx-auto block h-auto w-full max-w-[1500px] object-contain"
          src={cima}
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,var(--background)_0%,transparent_14%,transparent_86%,var(--background)_100%)]" />
      </div>

      <div className="relative mx-auto mt-10 max-w-6xl px-5 md:px-6">
        <div className="over-grid grid gap-4 md:grid-cols-2 md:gap-5">
          {blocks.map((b) => (
            <div
              key={b.tag}
              className="over-block glass-card rounded-2xl p-6 transition-colors hover:border-primary/50 md:p-7"
            >
              <p className="label-xs text-primary">{b.tag}</p>
              <p className="mt-3 text-[0.82rem] leading-relaxed text-muted-foreground md:text-sm">{b.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-2 gap-6 border-t border-border pt-10 md:grid-cols-4">
          {[
            ["+40", "projetos entregues"],
            ["8 anos", "de estrada"],
            ["+92%", "de venda no melhor caso"],
            ["2h", "tempo médio de resposta"],
          ].map(([a, b]) => (
            <div key={b}>
              <p className="font-display text-2xl font-semibold text-brand md:text-3xl">{a}</p>
              <p className="mt-1 text-[0.7rem] text-muted-foreground">{b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
