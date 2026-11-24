import { useState } from "react";
import { Columns3, MessageCircle, Table2 } from "lucide-react";

type Aba = "funil" | "base";

const etapas = [
  {
    nome: "Novo lead",
    cor: "#ff6500",
    total: "128",
    leads: [
      { nome: "Distribuidora Água Clara", cidade: "Curitiba", valor: "R$ 1.200" },
      { nome: "Mercado São Jorge", cidade: "Curitiba", valor: "R$ 980" },
      { nome: "Padaria Centro", cidade: "Pinhais", valor: "R$ 640" },
    ],
  },
  {
    nome: "Em contato",
    cor: "#ffb000",
    total: "34",
    leads: [
      { nome: "Suplementos Vida Ativa", cidade: "São Paulo", valor: "R$ 2.400" },
      { nome: "Nutri Forte Loja 2", cidade: "Osasco", valor: "R$ 1.750" },
    ],
  },
  {
    nome: "Negociando",
    cor: "#38bdf8",
    total: "11",
    leads: [
      { nome: "Contabilidade Horizonte", cidade: "Pato Branco", valor: "R$ 3.500" },
      { nome: "Escritório Primo & Cia", cidade: "Francisco Beltrão", valor: "R$ 2.900" },
    ],
  },
  {
    nome: "Ganhos",
    cor: "#22c55e",
    total: "6",
    leads: [{ nome: "Transportes Lima", cidade: "Cascavel", valor: "R$ 4.100" }],
  },
];

const base = [
  { nome: "Distribuidora Água Clara", contato: "(41) 99812-4410", cidade: "Curitiba", dono: "Ana" },
  { nome: "Mercado São Jorge", contato: "(41) 3322-0190", cidade: "Curitiba", dono: "Ana" },
  { nome: "Suplementos Vida Ativa", contato: "(11) 99714-2288", cidade: "São Paulo", dono: "Rafa" },
  {
    nome: "Contabilidade Horizonte",
    contato: "(46) 99920-7781",
    cidade: "Pato Branco",
    dono: "Léo",
  },
  { nome: "Transportes Lima", contato: "(45) 99663-1120", cidade: "Cascavel", dono: "Léo" },
];

// Mostra as duas telas que o cliente mais usa, recriadas na própria página
// para carregar rápido e ficar nítido em qualquer tamanho de tela.
export function ProductTour() {
  const [aba, setAba] = useState<Aba>("funil");

  return (
    <section id="produto" className="relative overflow-hidden bg-[#070707] py-20 md:py-28">
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-20" />
      <div className="pointer-events-none absolute -left-40 top-1/4 h-[28rem] w-[28rem] rounded-full bg-accent/10 blur-[150px]" />

      <div className="relative mx-auto max-w-6xl px-5 md:px-6">
        <div className="flex flex-col items-center text-center">
          <span className="label-xs rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-foreground/60">
            Por dentro do sistema
          </span>
          <h2 className="mt-5 max-w-3xl font-display text-2xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-3xl md:text-4xl">
            Os leads chegam organizados. Sua equipe só precisa{" "}
            <span className="text-brand">decidir quem atender primeiro.</span>
          </h2>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
            <Botao ativo={aba === "funil"} onClick={() => setAba("funil")} icone={Columns3}>
              Funil de vendas
            </Botao>
            <Botao ativo={aba === "base"} onClick={() => setAba("base")} icone={Table2}>
              Base de leads
            </Botao>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-white/[0.09] bg-[linear-gradient(145deg,rgb(23_23_23_/_96%),rgb(5_5_5_/_98%))] shadow-[0_40px_120px_-50px_rgb(0_0_0_/_95%)]">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <p className="text-[0.62rem] uppercase tracking-[0.16em] text-foreground/40">
              {aba === "funil" ? "Funil de vendas" : "Base de leads"}
            </p>
          </div>

          {aba === "funil" ? <Funil /> : <Base />}
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Cada lead chega com telefone, WhatsApp e cidade, já no nome do consultor responsável.
        </p>
      </div>
    </section>
  );
}

function Botao({
  ativo,
  onClick,
  icone: Icone,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  icone: typeof Columns3;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
        ativo ? "bg-brand text-primary-foreground" : "text-foreground/55 hover:text-foreground/80"
      }`}
    >
      <Icone className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </button>
  );
}

function Funil() {
  return (
    <div className="flex gap-3 overflow-x-auto p-4 sm:p-5">
      {etapas.map((etapa) => (
        <div
          key={etapa.nome}
          className="min-w-[200px] flex-1 rounded-2xl border border-white/[0.07] bg-black/40 p-3"
        >
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: etapa.cor }} />
            <p className="flex-1 truncate text-xs font-semibold">{etapa.nome}</p>
            <span className="rounded-full border border-white/10 px-1.5 text-[0.6rem] text-foreground/50">
              {etapa.total}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {etapa.leads.map((lead) => (
              <div
                key={lead.nome}
                className="rounded-xl border border-white/[0.06] bg-[#121214] px-2.5 py-2"
              >
                <p className="truncate text-[0.72rem] font-medium">{lead.nome}</p>
                <div className="mt-1 flex items-center justify-between gap-2 text-[0.6rem] text-foreground/45">
                  <span className="truncate">{lead.cidade}</span>
                  <span className="shrink-0 text-primary">{lead.valor}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Base() {
  return (
    <div className="overflow-x-auto p-4 sm:p-5">
      <table className="w-full min-w-[520px] border-collapse text-left">
        <thead>
          <tr className="text-[0.6rem] uppercase tracking-[0.14em] text-foreground/40">
            <th className="pb-3 font-medium">Lead</th>
            <th className="pb-3 font-medium">Contato</th>
            <th className="hidden pb-3 font-medium sm:table-cell">Cidade</th>
            <th className="pb-3 font-medium">Responsável</th>
            <th className="pb-3" />
          </tr>
        </thead>
        <tbody>
          {base.map((linha) => (
            <tr key={linha.nome} className="border-t border-white/[0.06]">
              <td className="py-3 pr-3 text-[0.75rem] font-medium">{linha.nome}</td>
              <td className="py-3 pr-3 text-[0.7rem] text-foreground/55">{linha.contato}</td>
              <td className="hidden py-3 pr-3 text-[0.7rem] text-foreground/55 sm:table-cell">
                {linha.cidade}
              </td>
              <td className="py-3 pr-3">
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[0.62rem] text-foreground/70">
                  {linha.dono}
                </span>
              </td>
              <td className="py-3 text-right">
                <span className="inline-flex items-center gap-1 text-[0.62rem] text-[#22c55e]">
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  WhatsApp
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
