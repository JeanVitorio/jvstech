import { ArrowRight, Clock3, Inbox, MonitorCheck, Sparkles } from "lucide-react";
import { LeadFlowLink } from "@/components/site/LeadFlowLink";
import { OfficeScene } from "@/components/site/pixel/OfficeScene";

const agentes = [
  { nome: "Distribuidoras", cidade: "Curitiba", camisa: "#ff6500", cabelo: "#2b2118" },
  { nome: "Suplementos", cidade: "São Paulo", camisa: "#38bdf8", cabelo: "#4a2c13" },
  { nome: "Contabilidades", cidade: "Pato Branco", camisa: "#22c55e", cabelo: "#1b1b20" },
];

const beneficios = [
  {
    icon: Clock3,
    titulo: "Procuram enquanto vocês vendem",
    texto:
      "Cada agente busca empresas do seu nicho nas cidades que você escolher, sem ninguém precisar ficar olhando.",
  },
  {
    icon: Inbox,
    titulo: "Entregam o contato pronto",
    texto:
      "O lead chega com telefone, WhatsApp e site, já atribuído ao consultor que vai fazer a abordagem.",
  },
  {
    icon: MonitorCheck,
    titulo: "Quem vende é a sua equipe",
    texto:
      "O agente não fala com o cliente: ele entrega a oportunidade e você acompanha tudo pela sala.",
  },
];

// Seção que mostra a sala de prospecção do produto, com os mesmos
// personagens que o cliente encontra depois de entrar.
export function AgentsRoom() {
  return (
    <section id="agentes" className="relative overflow-hidden bg-background py-20 md:py-28">
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-25" />
      <div className="pointer-events-none absolute -right-52 top-1/3 h-[32rem] w-[32rem] rounded-full bg-primary/12 blur-[160px]" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-6">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_0.72fr]">
          <div>
            <span className="pixel-tag">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Quem procura enquanto vocês vendem
            </span>
            <h2 className="mt-6 max-w-4xl font-display text-3xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-4xl md:text-5xl">
              Conheça os agentes que encontram os leads{" "}
              <span className="text-brand">para a sua equipe vender.</span>
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Dentro do LeadFlow cada agente tem a própria mesa. Ele procura as empresas, organiza os
            contatos e entrega a lista pronta ao responsável. Quem conversa, negocia e fecha
            continua sendo a sua equipe.
          </p>
        </div>

        {/* a sala, desenhada igual à do produto */}
        <div className="pixel-panel mt-12 overflow-hidden md:mt-16">
          <div className="relative flex items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4 sm:px-7">
            <p className="font-display text-base font-semibold text-white">Sala da prospecção</p>
            <div className="flex flex-wrap items-center gap-2">
              <Legenda cor="#22c55e" texto="3 trabalhando" />
              <Legenda cor="#ffb000" texto="leads chegando" />
            </div>
          </div>

          <OfficeScene agentes={agentes} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {beneficios.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.titulo}
                className="pixel-panel p-6 transition-colors hover:border-primary/40"
              >
                <span className="grid h-11 w-11 place-items-center border-2 border-primary/40 bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold sm:text-lg">
                  {item.titulo}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.texto}</p>
              </article>
            );
          })}
        </div>

        <div className="pixel-panel pixel-panel--brand mt-6 flex flex-col items-center justify-between gap-5 p-6 sm:flex-row sm:px-8">
          <div>
            <p className="font-display text-lg font-semibold">
              Monte sua sala e deixe o primeiro agente buscando leads.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Começa no plano Free, com 50 leads por mês e sem cartão.
            </p>
          </div>
          <LeadFlowLink
            href="/LeadFlow/signup?plan=free"
            className="pixel-btn group inline-flex min-h-12 shrink-0 items-center justify-center gap-2 bg-brand px-7 py-3 text-xs font-bold text-primary-foreground"
          >
            Gerar meus leads grátis
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

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] text-white/70">
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: cor, boxShadow: `0 0 6px ${cor}` }}
      />
      {texto}
    </span>
  );
}
