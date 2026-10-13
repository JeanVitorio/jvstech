import {
  ArrowRight,
  Bot,
  Check,
  Database,
  MapPin,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

const steps = [
  {
    icon: Search,
    number: "01",
    title: "Defina quem você procura",
    description: "Escolha o nicho e as cidades onde deseja encontrar novas empresas.",
    detail: "Nicho + localização",
  },
  {
    icon: Bot,
    number: "02",
    title: "Ative sua prospecção",
    description: "O LeadFlow pesquisa os contatos e organiza os dados encontrados para você.",
    detail: "Busca automatizada",
  },
  {
    icon: Database,
    number: "03",
    title: "Receba tudo no painel",
    description: "Telefone, WhatsApp, site e Instagram ficam centralizados sempre que disponíveis.",
    detail: "Dados organizados",
  },
  {
    icon: TrendingUp,
    number: "04",
    title: "Transforme contatos em vendas",
    description:
      "Distribua os leads, acompanhe cada etapa e mantenha o foco nas melhores oportunidades.",
    detail: "Funil comercial",
  },
];

export function HowItWorks() {
  return (
    <section id="metodo" className="relative overflow-hidden bg-background py-24 md:py-36">
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-25" />
      <div className="grain pointer-events-none absolute inset-0 opacity-20" />
      <div className="pointer-events-none absolute -left-52 top-1/4 h-[34rem] w-[34rem] rounded-full bg-primary/12 blur-[160px]" />
      <div className="pointer-events-none absolute -right-52 bottom-0 h-[30rem] w-[30rem] rounded-full bg-accent/10 blur-[160px]" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-6">
        <div className="grid items-end gap-8 lg:grid-cols-[1fr_0.72fr]">
          <div>
            <span className="label-xs inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.08] px-4 py-2 text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Simples desde o primeiro lead
            </span>
            <h2 className="mt-6 max-w-4xl font-display text-3xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-4xl md:text-5xl">
              Você escolhe o alvo. O LeadFlow transforma a busca em{" "}
              <span className="text-brand">um processo comercial.</span>
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Sem planilhas espalhadas e sem copiar contatos manualmente. Configure uma vez, acompanhe
            o fluxo e concentre sua energia nas conversas que podem virar vendas.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-[2rem] border border-white/[0.09] bg-[linear-gradient(145deg,rgb(23_23_23_/_96%),rgb(5_5_5_/_98%))] shadow-[0_40px_120px_-50px_rgb(0_0_0_/_95%)] md:mt-16">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-7">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <p className="flex items-center gap-2 text-[0.62rem] font-medium uppercase tracking-[0.16em] text-foreground/40">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#28c840]" />
              Fluxo LeadFlow
            </p>
          </div>

          <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
            <div className="relative overflow-hidden border-b border-white/[0.07] p-6 sm:p-9 lg:border-b-0 lg:border-r">
              <div className="pointer-events-none absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-primary/15 blur-[90px]" />
              <div className="relative">
                <p className="label-xs text-primary">Sua máquina de prospecção</p>
                <h3 className="mt-4 max-w-md font-display text-2xl font-semibold leading-tight sm:text-3xl">
                  Do filtro ao funil, tudo conectado.
                </h3>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Cada etapa alimenta a próxima. Os dados encontrados entram organizados no painel,
                  prontos para receber um responsável e avançar no seu processo de vendas.
                </p>

                <div className="mt-8 rounded-3xl border border-primary/20 bg-black/25 p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[0.62rem] uppercase tracking-[0.14em] text-foreground/40">
                        Você configura
                      </p>
                      <p className="mt-1 text-sm font-semibold">Nicho e cidades</p>
                    </div>
                  </div>

                  <div className="relative my-3 ml-[1.35rem] h-8 w-px bg-gradient-to-b from-primary to-primary/20">
                    <span className="absolute -left-[3px] top-1 h-2 w-2 animate-pulse rounded-full bg-primary shadow-[0_0_14px_rgb(255_101_0)]" />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand shadow-[0_10px_30px_-12px_rgb(255_101_0_/_90%)]">
                      <Zap className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[0.62rem] uppercase tracking-[0.14em] text-primary">
                        O LeadFlow executa
                      </p>
                      <p className="mt-1 text-sm font-semibold">Busca, organização e entrega</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {["Telefone", "WhatsApp", "Site"].map((item) => (
                      <span
                        key={item}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.035] px-2 py-2.5 text-[0.6rem] text-foreground/60"
                      >
                        <Check className="h-3 w-3 text-primary" aria-hidden="true" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <a
                  href="/LeadFlow/signup?plan=free"
                  className="group mt-7 inline-flex items-center gap-2 text-sm font-bold text-primary"
                >
                  Ativar minha prospecção
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </a>
              </div>
            </div>

            <div className="relative p-5 sm:p-8 lg:p-10">
              <div className="pointer-events-none absolute bottom-10 left-[3.45rem] top-10 w-px bg-gradient-to-b from-primary/60 via-primary/25 to-transparent sm:left-[4.95rem]" />
              <div className="relative space-y-3">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <article
                      key={step.number}
                      className={`group relative flex gap-4 rounded-2xl border p-4 transition-all duration-300 hover:translate-x-1 sm:gap-5 sm:p-5 ${
                        index === 1
                          ? "border-primary/35 bg-primary/[0.07] shadow-[0_20px_60px_-35px_rgb(255_101_0_/_70%)]"
                          : "border-transparent bg-white/[0.02] hover:border-white/[0.08] hover:bg-white/[0.04]"
                      }`}
                    >
                      <span
                        className={`relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${
                          index === 1
                            ? "border-primary bg-brand shadow-[0_10px_30px_-12px_rgb(255_101_0_/_90%)]"
                            : "border-primary/20 bg-[#111]"
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${
                            index === 1 ? "text-primary-foreground" : "text-primary"
                          }`}
                          aria-hidden="true"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-primary">
                            Passo {step.number}
                          </p>
                          <span className="rounded-full border border-white/[0.07] bg-black/20 px-2.5 py-1 text-[0.56rem] text-foreground/40">
                            {step.detail}
                          </span>
                        </div>
                        <h3 className="mt-2 font-display text-base font-semibold sm:text-lg">
                          {step.title}
                        </h3>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-5 rounded-3xl border border-primary/25 bg-primary/[0.055] p-6 sm:flex-row sm:px-8">
          <div>
            <p className="font-display text-lg font-semibold">
              Enquanto o LeadFlow procura, sua equipe pode vender.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Comece com 50 leads mensais no plano Free. Não precisa cadastrar cartão.
            </p>
          </div>
          <a
            href="/LeadFlow/signup?plan=free"
            className="group inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-7 py-3 text-xs font-bold text-primary-foreground shadow-[var(--glow-ice)] transition-transform hover:scale-[1.03]"
          >
            Criar conta grátis
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </a>
        </div>
      </div>
    </section>
  );
}
