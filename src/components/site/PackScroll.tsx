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
            // slight bob + drift so it reads as walking on top of the cards
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

      <div className="pack-head absolute left-6 top-[12vh] z-20 max-w-sm md:left-16">
        <p className="label-xs text-primary">◆ O método</p>
        <h2 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-tight md:text-4xl">
          Trabalhamos consigo desde o <span className="text-brand">primeiro contacto.</span>
        </h2>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Oito etapas do briefing ao lucro. Role para o lado — a página só liberta o
          caminho depois do último cartão.
        </p>
        <div className="logo-dock mt-6 h-16 w-16 opacity-0" aria-hidden />
      </div>

      {/* card track sitting on the lower half */}
      <div className="absolute inset-x-0 bottom-[10vh]">
        <div className="pack-track relative flex w-max gap-6 px-[8vw] will-change-transform">
          {loop.map((c, i) => (
            <article
              key={i}
              className="glass-card group relative h-[34vh] w-[78vw] shrink-0 overflow-hidden rounded-2xl p-7 transition-colors hover:border-primary/60 sm:w-[46vw] lg:w-[25vw]"
            >
              <span className="font-display text-4xl font-bold text-primary/25 transition-colors group-hover:text-primary/60">
                {c.n}
              </span>
              <h3 className="mt-1 font-display text-lg font-semibold">{c.t}</h3>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{c.d}</p>
              <div className="absolute bottom-0 left-0 h-px w-0 bg-[var(--gradient-brand)] transition-all duration-500 group-hover:w-full" />
            </article>
          ))}
        </div>
        {/* the wolf walks right ON the cards: its paws rest on the card top edge */}
        <div className="pack-wolf pointer-events-none absolute bottom-[34vh] left-1/2 z-10 -translate-x-1/2">
          <video
            ref={videoRef}
            className="h-[26vh] w-auto drop-shadow-[0_18px_30px_oklch(0.1_0.02_240_/_75%)]"
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
