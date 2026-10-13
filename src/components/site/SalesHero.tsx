import { useEffect, useRef } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Globe2,
  Instagram,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
} from "lucide-react";
import gsap from "gsap";
import capa from "@/assets/video_da_capa.mp4";
import { useVideoVisibility } from "@/hooks/use-video-visibility";

const assurances = ["50 leads por mês grátis", "Sem cartão de crédito", "Cancele quando quiser"];
const leadData = [
  { icon: Globe2, label: "Site oficial", value: "Encontrado" },
  { icon: Instagram, label: "Instagram", value: "Encontrado" },
  { icon: MessageCircle, label: "WhatsApp", value: "Encontrado" },
];

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
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="grain pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none absolute left-[-12rem] top-20 h-[34rem] w-[34rem] rounded-full bg-primary/15 blur-[150px]" />
      <div className="pointer-events-none absolute right-[-8rem] top-[-8rem] h-[42rem] w-[42rem] rounded-full bg-accent/10 blur-[170px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

      <div className="pointer-events-none absolute inset-y-0 right-[-18%] hidden w-[62%] items-end justify-center opacity-45 xl:flex">
        <video
          ref={videoRef}
          className="hero-video wolf-video h-[82vh] w-auto object-contain"
          src={capa}
          muted
          loop
          playsInline
          preload="metadata"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--background)_0%,transparent_38%,var(--background)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-10rem)] max-w-7xl items-center gap-14 px-5 md:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
        <div className="hero-copy max-w-2xl">
          <span className="label-xs inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/[0.09] px-4 py-2 text-primary shadow-[0_0_30px_-10px_rgb(255_101_0_/_80%)] backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Sua próxima venda começa com o lead certo
          </span>
          <h1 className="mt-7 font-display text-[2.65rem] font-semibold leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-[4.6rem]">
            Transforme buscas em <span className="text-brand">oportunidades reais.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-relaxed text-foreground/70 md:text-lg">
            O LeadFlow encontra empresas no Google, enriquece cada contato com site, WhatsApp e
            Instagram e organiza tudo para sua equipe entrar em ação.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="/LeadFlow/signup?plan=free"
              className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-brand px-8 py-4 text-sm font-bold text-primary-foreground shadow-[var(--glow-ice)] transition-all hover:scale-[1.03] hover:shadow-[0_0_80px_-12px_rgb(255_101_0_/_90%)]"
            >
              Gerar meus primeiros leads
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </a>
            <a
              href="#planos"
              className="inline-flex min-h-14 items-center justify-center rounded-full border border-border bg-card/55 px-8 py-4 text-sm font-semibold text-foreground/85 backdrop-blur-xl transition-all hover:border-primary/70 hover:bg-primary/[0.06] hover:text-primary"
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

        <div className="hero-video relative mx-auto w-full max-w-[620px] lg:ml-auto">
          <div className="pointer-events-none absolute -inset-10 rounded-full bg-primary/15 blur-[100px]" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0b0c]/90 p-3 shadow-[0_40px_120px_-32px_rgb(0_0_0_/_95%),0_0_80px_-35px_rgb(255_101_0_/_85%)] backdrop-blur-2xl sm:p-4">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-2 pb-3 sm:px-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>
              <span className="flex items-center gap-2 text-[0.62rem] font-medium text-foreground/45">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#28c840]" />
                Prospecção em andamento
              </span>
            </div>

            <div className="grid gap-3 pt-3 sm:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand shadow-[0_12px_30px_-12px_rgb(255_101_0_/_90%)]">
                    <Search className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
                  </span>
                  <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-wider text-primary">
                    Ao vivo
                  </span>
                </div>
                <p className="mt-5 text-[0.64rem] uppercase tracking-[0.18em] text-foreground/40">
                  Busca configurada
                </p>
                <p className="mt-2 font-display text-lg font-semibold">Empresas do seu nicho</p>
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5 text-xs text-foreground/60">
                  <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  Cidades selecionadas
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full w-[78%] rounded-full bg-brand shadow-[0_0_18px_rgb(255_101_0_/_85%)]" />
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-[linear-gradient(145deg,rgb(255_101_0_/_13%),rgb(255_255_255_/_3%))] p-4">
                <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl border border-primary/25 bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[0.6rem] uppercase tracking-[0.16em] text-primary">
                        Novo lead completo
                      </p>
                      <p className="mt-1 text-sm font-semibold">Empresa encontrada</p>
                    </div>
                  </div>
                  <span className="mt-1 h-2 w-2 animate-pulse rounded-full bg-[#28c840]" />
                </div>

                <div className="relative mt-5 space-y-2">
                  {leadData.map(({ icon: Icon, label, value }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5"
                    >
                      <span className="flex items-center gap-2 text-[0.68rem] text-foreground/55">
                        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        {label}
                      </span>
                      <span className="flex items-center gap-1.5 text-[0.62rem] font-medium text-[#67e8a7]">
                        <Check className="h-3 w-3" aria-hidden="true" />
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ["Automático", "Busca"],
                ["Centralizado", "Dados"],
                ["Organizado", "Funil"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-3 text-center"
                >
                  <p className="text-xs font-semibold text-foreground/90">{value}</p>
                  <p className="mt-0.5 text-[0.58rem] uppercase tracking-wider text-foreground/35">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-2xl border border-white/10 bg-[#111]/90 px-4 py-3 shadow-2xl backdrop-blur-xl sm:flex">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/12">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.62rem] text-foreground/45">Pronto para sua equipe</p>
              <p className="text-xs font-semibold">Contato enriquecido</p>
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
