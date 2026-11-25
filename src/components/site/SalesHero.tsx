import { useEffect, useRef } from "react";
import { ArrowRight, Check, ChevronDown, Sparkles } from "lucide-react";
import gsap from "gsap";
import { LeadFlowLink } from "@/components/site/LeadFlowLink";
import { useVideoVisibility } from "@/hooks/use-video-visibility";
import salaProspeccao from "@/assets/sala-prospeccao.mp4";

const assurances = ["50 leads por mês grátis", "Sem cartão de crédito", "Cancele quando quiser"];

const resumo = [
  ["Automático", "Busca"],
  ["Centralizado", "Dados"],
  ["Organizado", "Funil"],
];

export function SalesHero() {
  const root = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  useVideoVisibility(videoRef);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline
        .from(".hero-sala", { opacity: 0, y: 24, duration: 1.1 })
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
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="grain pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none absolute left-[-12rem] top-20 h-[34rem] w-[34rem] rounded-full bg-primary/15 blur-[150px]" />
      <div className="pointer-events-none absolute right-[-8rem] top-[-8rem] h-[42rem] w-[42rem] rounded-full bg-accent/10 blur-[170px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-10rem)] max-w-7xl items-center gap-12 px-5 md:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
        <div className="hero-copy max-w-2xl">
          <span className="pixel-tag">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Sua próxima venda começa com o lead certo
          </span>
          <h1 className="mt-7 font-display text-[2.65rem] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-[4.6rem]">
            Transforme buscas em <span className="text-brand">oportunidades reais.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-foreground/70 md:text-lg">
            O LeadFlow encontra empresas no Google, enriquece cada contato com site, WhatsApp e
            Instagram e entrega tudo organizado para sua equipe vender.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <LeadFlowLink
              href="/LeadFlow/signup?plan=free"
              className="pixel-btn group inline-flex min-h-14 items-center justify-center gap-2 bg-brand px-8 py-4 text-sm font-bold text-primary-foreground"
            >
              Gerar meus primeiros leads
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </LeadFlowLink>
            <a
              href="#planos"
              className="inline-flex min-h-14 items-center justify-center border-2 border-white/15 bg-white/[0.03] px-8 py-4 text-sm font-semibold text-foreground/85 transition-colors hover:border-primary/70 hover:bg-primary/[0.06] hover:text-primary"
            >
              Conhecer os planos
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

        {/* o vídeo do agente ocupa o lugar da sala desenhada */}
        <div className="hero-sala relative mx-auto w-fit max-w-full lg:ml-auto">
          <div className="pointer-events-none absolute -inset-10 rounded-full bg-primary/20 blur-[100px]" />
          <div className="pixel-panel relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>
              <span className="flex items-center gap-2 text-[0.62rem] font-medium text-foreground/45">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#28c840]" />
                Sala da prospecção · ao vivo
              </span>
            </div>

            <video
              ref={videoRef}
              className="block h-auto max-h-[min(58vh,560px)] w-auto max-w-full bg-black object-contain"
              src={salaProspeccao}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
              aria-label="Agente da sala de prospecção entregando leads"
            />

            <div className="grid grid-cols-3 gap-2 border-t border-white/[0.07] p-3">
              {resumo.map(([valor, rotulo]) => (
                <div
                  key={rotulo}
                  className="border-2 border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-center"
                >
                  <p className="text-xs font-semibold text-foreground/90">{valor}</p>
                  <p className="mt-0.5 text-[0.58rem] uppercase tracking-wider text-foreground/35">
                    {rotulo}
                  </p>
                </div>
              ))}
            </div>
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
