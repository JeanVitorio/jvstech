import { ArrowRight, Check, MapPin, Zap } from "lucide-react";
import { LeadFlowLink } from "@/components/site/LeadFlowLink";

const steps = [
  {
    number: "01",
    title: "Defina quem você procura",
    description: "Escolha o nicho e as cidades onde deseja encontrar novas empresas.",
    detail: "Nicho + localização",
  },
  {
    number: "02",
    title: "O agente sai à procura",
    description: "Ele varre o Google Maps e junta telefone, site, WhatsApp e Instagram.",
    detail: "Busca automatizada",
  },
  {
    number: "03",
    title: "Os leads chegam no painel",
    description: "Cada contato entra organizado e já no nome do consultor responsável.",
    detail: "Dados organizados",
  },
  {
    number: "04",
    title: "Sua equipe conversa e vende",
    description: "Com a lista pronta, o time abre o WhatsApp e trabalha as oportunidades.",
    detail: "Funil comercial",
  },
];

const entregue = ["Telefone", "WhatsApp", "Site", "Instagram"];

export function HowItWorks() {
  return (
    <section id="metodo" className="relative overflow-hidden bg-background py-20 md:py-28">
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-25" />
      <div className="pointer-events-none absolute -left-52 top-1/4 h-[34rem] w-[34rem] rounded-full bg-primary/12 blur-[160px]" />

      <div className="relative mx-auto max-w-6xl px-5 md:px-6">
        <div className="flex flex-col items-center text-center">
          <span className="pixel-tag">Do nicho ao fechamento</span>
          <h2 className="mt-5 max-w-3xl font-display text-3xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-4xl md:text-5xl">
            Quatro passos, e a sua equipe nunca mais{" "}
            <span className="text-brand">procura cliente na mão.</span>
          </h2>
        </div>

        {/* trilha dos passos, em blocos quadrados */}
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {steps.map((step, index) => (
            <article
              key={step.number}
              className={`pixel-panel p-5 sm:p-6 ${index === 1 ? "pixel-panel--brand" : ""}`}
            >
              <div className="flex items-start gap-4">
                <span className="pixel-step shrink-0">{step.number}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-base font-semibold sm:text-lg">
                      {step.title}
                    </h3>
                    <span className="border-2 border-white/10 px-2 py-0.5 text-[0.56rem] uppercase tracking-[0.14em] text-foreground/45">
                      {step.detail}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {step.description}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* o que o agente entrega em cada lead */}
        <div className="pixel-panel mt-4 flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center border-2 border-primary/50 bg-primary/10">
              <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.62rem] uppercase tracking-[0.16em] text-primary">
                Você configura uma vez
              </p>
              <p className="mt-1 flex items-center gap-2 font-display text-lg font-semibold">
                <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                Nicho e cidades
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Depois disso o agente repete o trabalho sozinho, quantas vezes você quiser.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[22rem]">
            {entregue.map((item) => (
              <span
                key={item}
                className="flex items-center justify-center gap-1.5 border-2 border-white/10 bg-white/[0.03] px-2 py-2 text-[0.62rem] text-foreground/65"
              >
                <Check className="h-3 w-3 text-primary" aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <LeadFlowLink
            href="/LeadFlow/signup?plan=free"
            className="pixel-btn group inline-flex min-h-12 items-center justify-center gap-2 bg-brand px-7 py-3 text-xs font-bold text-primary-foreground"
          >
            Começar com 50 leads grátis
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </LeadFlowLink>
        </div>
      </div>
    </section>
  );
}
