import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import lado from "@/assets/caminhando_de_lado.mp4.asset.json";

const cards = [
  { n: "01", t: "Diagnóstico", d: "Farejamos o negócio inteiro: oferta, público e o ponto exato onde o dinheiro está vazando." },
  { n: "02", t: "Estratégia", d: "Mapeamos a jornada, escrevemos a copy e desenhamos o caminho mais curto até o sim." },
  { n: "03", t: "Design", d: "Interface com personalidade, hierarquia brutal e zero ruído entre o visitante e o botão." },
  { n: "04", t: "Código", d: "Performance de predador: build enxuto, Core Web Vitals no verde, nada de peso morto." },
  { n: "05", t: "Integrações", d: "WhatsApp, CRM, pagamento, e-mail. Tudo conversando sem intervenção humana." },
  { n: "06", t: "Lançamento", d: "Publicação acompanhada, testes em dispositivos reais e monitoramento desde o minuto zero." },
  { n: "07", t: "Otimização", d: "Medimos, cortamos o que não converte e reforçamos o que vende. Todo mês." },
  { n: "08", t: "Escala", d: "Quando o funil aguenta pressão, aumentamos o volume. Só então." },
];

export function PackScroll() {
  const root = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const track = root.current!.querySelector<HTMLElement>(".pack-track")!;
      const distance = () => track.scrollWidth / 2;

      const video = videoRef.current;
      let paw = 0;
      let last = 0;

      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: () => "+=" + distance() * 1.15,
          pin: true,
          scrub: 0.5,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            // the wolf only ever steps FORWARD, no matter the scroll direction
            paw += Math.abs(self.progress - last) * 9;
            last = self.progress;
            if (video && video.duration) {
              video.currentTime = (paw * video.duration) % video.duration;
            }
            gsap.set(".pack-wolf", { x: (self.progress - 0.5) * 140 });
          },
        },
      });

      gsap.from(".pack-head > *", {
        y: 30,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        scrollTrigger: { trigger: root.current, start: "top 70%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const loop = [...cards, ...cards];

  return (
    <section
      id="rastro"
      ref={root}
      className="relative h-screen overflow-hidden bg-background"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[46vh] bg-[radial-gradient(ellipse_at_center,oklch(0.3_0.09_210_/_0.35),transparent_70%)]" />

      {/* the wolf walking to the right, on top of the cards */}
      <div className="pack-wolf pointer-events-none absolute left-1/2 top-[3vh] -translate-x-1/2">
        <video
          ref={videoRef}
          className="wolf-video h-[38vh] w-auto"
          src={lado.url}
          muted
          playsInline
          preload="auto"
        />
      </div>

      <div className="pack-head absolute left-6 top-[6vh] z-10 max-w-xs md:left-16">
        <p className="rune text-[0.6rem] text-primary">◆ O rastro</p>
        <h2 className="mt-3 font-display text-2xl leading-tight md:text-4xl">
          Arraste. <span className="text-pelt">O lobo anda com você.</span>
        </h2>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Oito etapas do briefing ao lucro. Role para o lado — a página só libera
          o caminho depois do último cartão.
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-[8vh]">
        <div className="pack-track flex w-max gap-6 px-[8vw] will-change-transform">
          {loop.map((c, i) => (
            <article
              key={i}
              className="group relative h-[38vh] w-[78vw] shrink-0 overflow-hidden rounded-sm border border-border bg-card/80 p-7 backdrop-blur transition-colors hover:border-primary/60 sm:w-[46vw] lg:w-[26vw]"
            >
              <span className="font-stencil text-5xl text-primary/25 transition-colors group-hover:text-primary/60">
                {c.n}
              </span>
              <h3 className="mt-2 font-display text-xl">{c.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.d}</p>
              <div className="absolute bottom-0 left-0 h-px w-0 bg-[var(--gradient-pelt)] transition-all duration-500 group-hover:w-full" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
