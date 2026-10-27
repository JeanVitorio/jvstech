import { CheckCircle2, Clock3, Eye, Users } from "lucide-react";
import { LeadFlowLink } from "@/components/site/LeadFlowLink";

const benefits = [
  {
    icon: Clock3,
    title: "Recupere tempo comercial",
    description:
      "Reduza a busca manual e deixe sua equipe concentrada em conversar com potenciais clientes.",
  },
  {
    icon: Eye,
    title: "Enxergue cada oportunidade",
    description: "Saiba em qual etapa cada contato está e qual é a próxima ação necessária.",
  },
  {
    icon: Users,
    title: "Organize sua equipe",
    description: "Defina responsáveis e mantenha todos trabalhando no mesmo processo comercial.",
  },
  {
    icon: CheckCircle2,
    title: "Evite contatos esquecidos",
    description: "Centralize histórico e informações para dar continuidade a cada negociação.",
  },
];

export function ConversionBenefits() {
  return (
    <section id="resultados" className="relative overflow-hidden py-20 md:py-28">
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-35" />
      <div className="pointer-events-none absolute -right-20 top-1/4 h-96 w-96 rounded-full bg-accent/10 blur-[130px]" />

      <div className="relative mx-auto max-w-6xl px-5 md:px-6">
        <div className="grid items-end gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="label-xs text-primary">◆ O ganho no dia a dia</p>
            <h2 className="mt-4 max-w-2xl font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl">
              Sua equipe para de procurar dados e começa a{" "}
              <span className="text-brand">criar oportunidades.</span>
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            O LeadFlow coloca prospecção, contatos, responsáveis e funil no mesmo lugar para você
            agir com mais clareza e menos retrabalho.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article
                key={benefit.title}
                className="glass-card group flex gap-5 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 md:p-7"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-primary/40 bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold">{benefit.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-primary/30 bg-primary/[0.06] p-6 md:px-8">
          <div>
            <p className="font-display text-lg font-semibold">
              Veja o LeadFlow funcionando com seus próprios objetivos.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Comece gratuitamente e escolha um plano maior quando precisar.
            </p>
          </div>
          <LeadFlowLink
            href="/LeadFlow/signup?plan=free"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-7 py-3 text-xs font-bold text-primary-foreground shadow-[var(--glow-ice)] transition-transform hover:scale-[1.03]"
          >
            Testar grátis agora →
          </LeadFlowLink>
        </div>
      </div>
    </section>
  );
}
