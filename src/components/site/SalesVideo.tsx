import { ArrowRight, Check, Play } from "lucide-react";
import { LeadFlowLink } from "@/components/site/LeadFlowLink";

const videoUrl =
  "https://aourdqlbrrzbqguuoawf.supabase.co/storage/v1/object/public/VideoLeadFlow/JVS_LeadFlow_advertisement_script_20261013210229.mp4";

const benefits = [
  "Encontre empresas do seu nicho",
  "Receba site, WhatsApp e Instagram",
  "Organize os leads em um só lugar",
];

export function SalesVideo() {
  return (
    <section
      id="conheca-o-leadflow"
      className="relative isolate overflow-hidden border-y border-white/[0.06] py-20 md:py-28"
    >
      <div className="tech-grid pointer-events-none absolute inset-0 -z-20 opacity-35" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[34rem] w-[70rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[150px]" />

      <div className="mx-auto max-w-7xl px-5 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <span className="label-xs inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.08] px-4 py-2 text-primary">
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            Veja o LeadFlow em ação
          </span>

          <h2 className="mt-6 font-display text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl md:text-5xl">
            Um minuto para entender como encontrar{" "}
            <span className="text-brand">mais oportunidades.</span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-foreground/65 md:text-base">
            Assista ao vídeo e descubra como transformar buscas no Google em contatos prontos para
            sua equipe comercial.
          </p>
        </div>

        <div className="relative mx-auto mt-12 max-w-5xl">
          <div className="pointer-events-none absolute -inset-5 rounded-[2.5rem] bg-primary/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[1.5rem] border border-primary/30 bg-[#090909] p-2 shadow-[0_35px_110px_-35px_rgb(0_0_0_/_95%),0_0_90px_-45px_rgb(255_101_0_/_95%)] sm:rounded-[2rem] sm:p-3">
            <div className="absolute inset-x-16 top-0 z-10 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
            <video
              className="aspect-video w-full rounded-[1.1rem] bg-black object-cover sm:rounded-[1.45rem]"
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              aria-label="Vídeo de apresentação do JVS LeadFlow"
            />
          </div>
        </div>

        <div className="mx-auto mt-9 flex max-w-5xl flex-col items-center justify-between gap-7 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-6 py-6 backdrop-blur-xl lg:flex-row lg:px-8">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 lg:justify-start">
            {benefits.map((benefit) => (
              <p
                key={benefit}
                className="flex items-center gap-2 text-xs font-medium text-foreground/70"
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/15">
                  <Check className="h-3 w-3 text-primary" aria-hidden="true" />
                </span>
                {benefit}
              </p>
            ))}
          </div>

          <LeadFlowLink
            href="/LeadFlow/signup?plan=free"
            className="group inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-7 py-3 text-xs font-bold text-primary-foreground shadow-[var(--glow-ice)] transition-all hover:scale-[1.03]"
          >
            Começar grátis agora
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </LeadFlowLink>
        </div>
      </div>
    </section>
  );
}
