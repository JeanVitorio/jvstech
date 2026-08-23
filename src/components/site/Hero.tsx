import { useEffect, useRef } from "react";
import gsap from "gsap";
import capa from "@/assets/video_da_capa.mp4.asset.json";

const stats = [
  ["24h", "tempo de resposta"],
  ["+40", "projetos entregues"],
  ["1 mês", "de suporte grátis"],
];

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-video", { opacity: 0, scale: 1.18, duration: 1.6 })
        .from(".hero-left > *", { x: -50, opacity: 0, stagger: 0.1, duration: 0.9 }, 0.3)
        .from(".hero-right > *", { x: 50, opacity: 0, stagger: 0.1, duration: 0.9 }, 0.4)
        .from(".hero-stat", { y: 24, opacity: 0, stagger: 0.08, duration: 0.7 }, 0.9)
        .from(".hero-arc", { scaleX: 0.4, opacity: 0, duration: 1.4 }, 0.5);

      gsap.to(".hero-dot", { y: 12, repeat: -1, yoyo: true, duration: 1.1, ease: "sine.inOut" });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="topo"
      ref={root}
      className="relative min-h-screen overflow-hidden bg-background pt-28"
    >
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,oklch(0.5_0.15_230_/_25%),transparent_70%)]" />

      {/* front-walking wolf splitting the screen */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
        <video
          className="hero-video wolf-video h-[86vh] w-auto min-w-full object-cover md:min-w-0"
          src={capa.url}
          autoPlay
          muted
          loop
          playsInline
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,var(--background)_88%)]" />

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-6 md:grid-cols-[1fr_minmax(200px,24vw)_1fr]">
        <div className="hero-left max-w-md space-y-6">
          <span className="label-xs inline-block rounded-full border border-border px-3 py-1 text-primary">
            JVS Tech · Soluções digitais
          </span>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
            Criamos o <span className="text-brand">seu site</span>, pensado para vender.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Estudamos o seu mercado, os seus clientes e construímos uma estrutura digital
            que trabalha por você — todos os dias, sem pausa.
          </p>
        </div>

        <div className="hidden md:block" aria-hidden />

        <div className="hero-right max-w-md space-y-6 md:text-right">
          <span className="label-xs inline-block rounded-full border border-border px-3 py-1 text-accent">
            Sites · Landing pages · Sistemas
          </span>
          <h2 className="font-display text-2xl font-semibold leading-tight tracking-tight md:text-3xl">
            Não vendemos páginas. Entregamos <span className="text-brand">receita previsível</span>.
          </h2>
          <div className="flex flex-col gap-3 md:items-end">
            <a
              href="#orcamento"
              className="inline-flex items-center justify-center rounded-full bg-brand px-7 py-3 text-xs font-semibold text-primary-foreground shadow-[var(--glow-ice)] transition-transform hover:scale-[1.04]"
            >
              Peça um orçamento grátis →
            </a>
            <a
              href="#servicos"
              className="inline-flex items-center justify-center rounded-full border border-border px-7 py-3 text-xs font-medium text-foreground/80 backdrop-blur transition-colors hover:border-primary hover:text-primary"
            >
              Os nossos serviços →
            </a>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-4 px-6 text-center">
        {stats.map(([a, b]) => (
          <div key={b} className="hero-stat">
            <p className="font-display text-2xl font-semibold text-brand md:text-3xl">{a}</p>
            <p className="mt-1 text-[0.65rem] text-muted-foreground">{b}</p>
          </div>
        ))}
      </div>

      {/* luminous arc, the horizon under the hero */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[-22vh] z-0 flex justify-center">
        <div
          className="hero-arc h-[46vh] w-[130vw] rounded-[50%]"
          style={{
            background:
              "radial-gradient(closest-side, oklch(0.92 0.1 200 / 90%), oklch(0.72 0.16 215 / 45%) 45%, transparent 72%)",
            filter: "blur(6px)",
          }}
        />
      </div>

      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2">
        <span className="label-xs text-muted-foreground">role</span>
        <span className="hero-dot h-1.5 w-1.5 rounded-full bg-primary" />
      </div>
    </section>
  );
}
