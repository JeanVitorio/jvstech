import { useEffect, useRef } from "react";
import gsap from "gsap";
import capa from "@/assets/video_da_capa.mp4.asset.json";

export function HeroWolf() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-video", { opacity: 0, scale: 1.15, duration: 1.6 })
        .from(".hero-left > *", { x: -60, opacity: 0, stagger: 0.12, duration: 0.9 }, 0.35)
        .from(".hero-right > *", { x: 60, opacity: 0, stagger: 0.12, duration: 0.9 }, 0.45)
        .from(".hero-rune", { opacity: 0, y: 20, duration: 0.8 }, 0.2);

      gsap.to(".hero-scroll-dot", {
        y: 14,
        repeat: -1,
        yoyo: true,
        duration: 1.1,
        ease: "sine.inOut",
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative min-h-screen overflow-hidden bg-background">
      {/* wolf walking towards the viewer, dead center */}
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center">
        <video
          className="hero-video wolf-video h-[105vh] w-auto min-w-full object-cover md:min-w-0"
          src={capa.url}
          autoPlay
          muted
          loop
          playsInline
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--background)_92%)]" />
      <div className="grain pointer-events-none absolute inset-0 opacity-40" />

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-7">
        <span className="font-display text-lg tracking-[0.2em] text-foreground">
          JVS<span className="text-pelt"> ALCATEIA</span>
        </span>
        <nav className="hidden gap-8 text-xs rune text-muted-foreground md:flex">
          <a className="transition-colors hover:text-primary" href="#matilha">Serviços</a>
          <a className="transition-colors hover:text-primary" href="#caca">Cases</a>
          <a className="transition-colors hover:text-primary" href="#rastro">Processo</a>
          <a className="transition-colors hover:text-primary" href="#uivo">Contato</a>
        </nav>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-6rem)] max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-24 md:grid-cols-[1fr_minmax(220px,26vw)_1fr]">
        <div className="hero-left max-w-sm space-y-6 text-left">
          <p className="hero-rune rune text-[0.65rem] text-primary">Território digital</p>
          <h1 className="font-display text-4xl leading-[1.05] md:text-5xl">
            Sites que <span className="text-pelt">caçam</span> clientes
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Não fazemos vitrine bonita. Construímos predadores de conversão: cada pixel
            farejando a próxima venda, dia e noite, sem descanso.
          </p>
        </div>

        <div className="hidden md:block" aria-hidden />

        <div className="hero-right max-w-sm space-y-6 text-left md:text-right">
          <p className="rune text-[0.65rem] text-accent">Sistemas sob medida</p>
          <h2 className="font-display text-3xl leading-tight md:text-4xl">
            Enquanto o mercado <span className="text-pelt">pasta</span>, você avança
          </h2>
          <div className="flex flex-col gap-3 md:items-end">
            <a
              href="https://wa.me/5546991163405"
              className="group inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-7 py-3 text-xs rune text-primary-foreground shadow-[var(--glow-moss)] transition-transform hover:scale-[1.03]"
            >
              Quero vender mais
            </a>
            <a
              href="#matilha"
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-border px-7 py-3 text-xs rune text-foreground/80 backdrop-blur transition-colors hover:border-primary hover:text-primary"
            >
              Ver o que fazemos
            </a>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2">
        <span className="rune text-[0.6rem] text-muted-foreground">rastreie</span>
        <span className="hero-scroll-dot h-2 w-2 rounded-full bg-primary" />
      </div>
    </section>
  );
}
