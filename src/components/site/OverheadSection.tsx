import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import cima from "@/assets/caminhando_de_cima.mp4.asset.json";

export function OverheadSection() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.to(".over-video", {
        yPercent: 18,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
      });
      gsap.from(".over-col-left > *", {
        x: -50,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: ".over-copy", start: "top 80%" },
      });
      gsap.from(".over-col-right > *", {
        x: 50,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: ".over-copy", start: "top 80%" },
      });
      gsap.from(".over-title", {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 60%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative overflow-hidden pb-28 pt-16">
      {/* wolf seen from above, descending into the copy */}
      <div className="relative mx-auto flex max-w-6xl justify-center px-6">
        <video
          className="over-video wolf-video w-[86%] max-w-3xl rotate-90 md:w-[52%]"
          src={cima.url}
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,var(--background)_95%)]" />
      </div>

      <div className="relative z-10 mx-auto -mt-24 max-w-6xl px-6 md:-mt-32">
        <h2 className="over-title mx-auto max-w-3xl text-center font-display text-3xl leading-tight md:text-5xl">
          Ele desce sobre o problema.<br />
          <span className="text-pelt">Nós descemos sobre o seu funil.</span>
        </h2>

        {/* copy split by the wolf's body so reading is never blocked */}
        <div className="over-copy mt-14 grid grid-cols-1 items-start gap-10 md:grid-cols-[1fr_18vw_1fr]">
          <div className="over-col-left space-y-8 md:text-right">
            <div>
              <p className="rune text-[0.6rem] text-primary">O que trava</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Site bonito que não vende. Formulário que ninguém preenche. Orçamento
                que some no WhatsApp. Planilha rodando a operação inteira.
              </p>
            </div>
            <div>
              <p className="rune text-[0.6rem] text-primary">O que custa</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Cada mês parado é receita entregue de bandeja para o concorrente que
                respondeu primeiro.
              </p>
            </div>
          </div>

          <div className="hidden md:block" aria-hidden />

          <div className="over-col-right space-y-8">
            <div>
              <p className="rune text-[0.6rem] text-accent">O que fazemos</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Reescrevemos a oferta, encurtamos o caminho até a compra e automatizamos
                o que consome seu time.
              </p>
            </div>
            <div>
              <p className="rune text-[0.6rem] text-accent">O que sobra</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Um ativo que trabalha 24h, mede tudo e melhora todo mês. Previsível,
                rastreável, seu.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-6 border-t border-border pt-10 md:grid-cols-4">
          {[
            ["+40", "projetos entregues"],
            ["8 anos", "de estrada"],
            ["+92%", "de venda no melhor case"],
            ["2h", "tempo médio de resposta"],
          ].map(([a, b]) => (
            <div key={b}>
              <p className="font-display text-2xl text-pelt md:text-3xl">{a}</p>
              <p className="mt-1 text-[0.7rem] text-muted-foreground">{b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
