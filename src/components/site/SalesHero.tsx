import { useEffect, useRef, type RefObject } from "react";
import { ArrowRight, Check, ChevronDown, Sparkles } from "lucide-react";
import gsap from "gsap";
import { LeadFlowLink } from "@/components/site/LeadFlowLink";
import { useVideoVisibility } from "@/hooks/use-video-visibility";
import salaProspeccao from "@/assets/sala-prospeccao.mp4";

const assurances = ["50 leads por mês grátis", "Sem cartão de crédito", "Cancele quando quiser"];

// O vídeo vem com fundo preto. Aqui o preto sai e sobra só o agente.
function useAgenteSemFundo(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
) {
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const contexto = canvas.getContext("2d", { willReadFrequently: true });
    if (!contexto) return;

    let quadro = 0;
    let ativo = true;

    const desenhar = () => {
      if (!ativo) return;
      if (!video.paused && video.readyState >= 2 && video.videoWidth > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imagem = contexto.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imagem.data;
        for (let i = 0; i < pixels.length; i += 4) {
          const vermelho = pixels[i];
          const verde = pixels[i + 1];
          const azul = pixels[i + 2];
          const maior = Math.max(vermelho, verde, azul);
          const menor = Math.min(vermelho, verde, azul);
          // Só o preto sem cor some. Calça e cabelo escuros continuam.
          if (maior < 42 && maior - menor < 16) {
            pixels[i + 3] = 0;
          } else if (maior < 80 && maior - menor < 24) {
            pixels[i + 3] = Math.round(((maior - 42) / 38) * 255);
          }
        }
        contexto.putImageData(imagem, 0, 0);
      }
      quadro = requestAnimationFrame(desenhar);
    };

    quadro = requestAnimationFrame(desenhar);
    return () => {
      ativo = false;
      cancelAnimationFrame(quadro);
    };
  }, [videoRef, canvasRef]);
}

export function SalesHero() {
  const root = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useVideoVisibility(videoRef);
  useAgenteSemFundo(videoRef, canvasRef);

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

        {/* só o agente, sem a caixa escura em volta */}
        <div className="hero-sala relative mx-auto w-fit max-w-full lg:ml-auto">
          <div className="pointer-events-none absolute -inset-16 rounded-full bg-primary/25 blur-[110px]" />
          <video
            ref={videoRef}
            className="pointer-events-none absolute h-px w-px opacity-0"
            src={salaProspeccao}
            muted
            loop
            playsInline
            autoPlay
            preload="auto"
            aria-hidden="true"
          />
          <canvas
            ref={canvasRef}
            width={720}
            height={1280}
            className="relative block h-auto max-h-[min(84vh,800px)] w-auto max-w-full"
            aria-label="Agente da sala de prospecção entregando leads"
          />
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
