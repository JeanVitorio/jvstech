import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import wolfSide from "@/assets/wolf-side.webm.asset.json";

const cards = [
  { n: "01", t: "Conversa inicial", d: "Ouvimos o seu negócio, os objetivos e o que precisa. Sem compromisso." },
  { n: "02", t: "Diagnóstico", d: "Analisamos concorrência, público e o ponto exato onde o dinheiro está a escapar." },
  { n: "03", t: "Proposta", d: "Escopo claro: o que será feito, em quanto tempo e por quanto. Nada de surpresas." },
  { n: "04", t: "Design", d: "Mostramos como o seu site vai ficar. Só avançamos quando aprovar." },
  { n: "05", t: "Desenvolvimento", d: "Código enxuto, Core Web Vitals no verde e integrações com WhatsApp, CRM e pagamento." },
  { n: "06", t: "Testes", d: "Dispositivos reais, formulários, velocidade e SEO técnico revisados linha a linha." },
  { n: "07", t: "Lançamento", d: "Publicação acompanhada e monitorização desde o primeiro minuto no ar." },
  { n: "08", t: "Otimização", d: "Medimos, cortamos o que não converte e reforçamos o que vende. Todos os meses." },
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
          end: () => "+=" + distance() * 1.25,
          pin: true,
          scrub: 0.4,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            // the wolf only ever steps FORWARD, whichever way the user scrolls
            paw += Math.abs(self.progress - last) * 14;
            last = self.progress;
            if (video && video.duration) {
              video.currentTime = (paw * video.duration) % video.duration;
            }
            gsap.set(".pack-wolf", {
              x: (self.progress - 0.5) * 220,
              y: Math.sin(paw * Math.PI * 2) * 6,
            });
          },
        },
      });

      gsap.from(".pack-head > *", {
        y: 28,
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
    <section id="metodo" ref={root} className="relative h-screen overflow-hidden bg-background">
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute inset-x-0 top-1/4 h-[50vh] bg-[radial-gradient(ellipse_at_center,oklch(0.4_0.12_220_/_28%),transparent_70%)]" />

      <div className="pack-head absolute left-5 right-5 top-[13vh] z-20 max-w-sm md:left-16 md:right-auto">
        <p className="label-xs text-primary">◆ O método</p>
        <h2 className="mt-3 font-display text-xl font-semibold leading-tight tracking-tight sm:text-2xl md:text-4xl">
          Trabalhamos consigo desde o <span className="text-brand">primeiro contacto.</span>
        </h2>
        <p className="mt-3 text-[0.72rem] leading-relaxed text-muted-foreground md:text-xs">
          Oito etapas do briefing ao lucro. Role para o lado — a página só liberta o
          caminho depois do último cartão.
        </p>
      </div>

      {/* card track sitting on the lower half */}
      <div className="absolute inset-x-0 bottom-[8vh] md:bottom-[10vh]">
        <div className="pack-track relative flex w-max gap-4 px-[8vw] will-change-transform md:gap-6">
          {loop.map((c, i) => (
            <article
              key={i}
              className="glass-card group relative h-[32vh] w-[76vw] shrink-0 overflow-hidden rounded-2xl p-5 transition-colors hover:border-primary/60 sm:w-[46vw] md:h-[34vh] md:p-7 lg:w-[25vw]"
            >
              <span className="font-display text-3xl font-bold text-primary/25 transition-colors group-hover:text-primary/60 md:text-4xl">
                {c.n}
              </span>
              <h3 className="mt-1 font-display text-base font-semibold md:text-lg">{c.t}</h3>
              <p className="mt-3 text-[0.75rem] leading-relaxed text-muted-foreground md:text-xs">{c.d}</p>
              <div className="absolute bottom-0 left-0 h-px w-0 bg-brand transition-all duration-500 group-hover:w-full" />
            </article>
          ))}
        </div>
        {/* the wolf walks right ON the cards: its paws rest on the card top edge */}
        <div className="pack-wolf pointer-events-none absolute bottom-[32vh] left-1/2 z-10 -translate-x-1/2 md:bottom-[34vh]">
          <video
            ref={videoRef}
            className="h-[16vh] w-auto drop-shadow-[0_18px_30px_oklch(0.1_0.02_240_/_75%)] md:h-[26vh]"
            src={wolfSide.url}
            muted
            playsInline
            preload="auto"
          />
          <div className="mx-auto -mt-3 h-3 w-[70%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,oklch(0.72_0.16_215_/_45%),transparent_70%)] blur-[2px]" />
        </div>
      </div>
    </section>
  );
}
