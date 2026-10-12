import { useEffect, useRef } from "react";
import { Check, ChevronDown } from "lucide-react";
import gsap from "gsap";
import capa from "@/assets/video_da_capa.mp4";
import { useVideoVisibility } from "@/hooks/use-video-visibility";

const assurances = ["50 leads por mês grátis", "Sem cartão de crédito", "Cancele quando quiser"];

export function SalesHero() {
  const root = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  useVideoVisibility(videoRef);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline
        .from(".hero-video", { opacity: 0, scale: 1.12, duration: 1.5 })
        .from(".hero-copy > *", { y: 28, opacity: 0, stagger: 0.08, duration: 0.75 }, 0.2)
        .from(".hero-proof", { y: 18, opacity: 0, stagger: 0.07, duration: 0.6 }, 0.7);
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="topo"
      ref={root}
      className="relative min-h-screen overflow-hidden bg-background pb-16 pt-28 md:pb-20 md:pt-32"
    >
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-65" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(ellipse_at_top,rgb(255_101_0_/_24%),transparent_70%)]" />

      <div className="pointer-events-none absolute inset-y-0 right-[-12%] hidden w-[62%] items-end justify-center lg:flex">
        <video
          ref={videoRef}
          className="hero-video wolf-video h-[88vh] w-auto object-contain opacity-80"
          src={capa}
          muted
          loop
          playsInline
          preload="metadata"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--background)_0%,transparent_40%,var(--background)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-12rem)] max-w-7xl items-center px-5 md:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hero-copy max-w-3xl">
          <span className="label-xs inline-flex rounded-full border border-primary/35 bg-primary/[0.08] px-4 py-2 text-primary">
            Prospecção inteligente para sua empresa
          </span>
          <h1 className="mt-6 font-display text-[2.35rem] font-semibold leading-[1.04] tracking-tight sm:text-5xl md:text-6xl">
            Encontre novos clientes sem perder horas{" "}
            <span className="text-brand">procurando contatos.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/75 md:text-lg">
            O LeadFlow busca empresas, organiza telefone, site, e-mail e Instagram e entrega tudo em
            um painel pronto para sua equipe vender.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="/LeadFlow/signup?plan=free"
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-brand px-8 py-4 text-sm font-bold text-primary-foreground shadow-[var(--glow-ice)] transition-transform hover:scale-[1.03]"
            >
              Criar minha conta grátis →
            </a>
            <a
              href="#planos"
              className="inline-flex min-h-14 items-center justify-center rounded-full border border-border bg-background/45 px-8 py-4 text-sm font-semibold text-foreground/85 backdrop-blur transition-colors hover:border-primary hover:text-primary"
            >
              Ver planos
            </a>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {assurances.map((item) => (
              <p
                key={item}
                className="hero-proof flex items-center gap-2 text-xs text-muted-foreground"
              >
                <span className="grid h-4 w-4 place-items-center rounded-full bg-primary/15">
                  <Check className="h-3 w-3 text-primary" aria-hidden="true" />
                </span>
                {item}
              </p>
            ))}
          </div>
        </div>
      </div>

      <a
        href="#servicos"
        aria-label="Conhecer os recursos"
        className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
      >
        <span className="text-[0.62rem] font-semibold uppercase tracking-[0.2em]">
          Entenda em 1 minuto
        </span>
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </a>
    </section>
  );
}
