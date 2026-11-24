import { useEffect, useState } from "react";
import { AlertTriangle, Filter, Trophy, Users } from "lucide-react";
import { PixelWorker } from "@/components/bots/office/PixelWorker";
import {
  montarVendedores,
  type EtapaResumo,
  type LeadResumo,
  type VendedorResumo,
} from "./funnelData";
import "@/components/bots/office/office.css";

interface SalesFloorProps {
  usuarios: { id: string; name: string; email: string; avatar_url?: string | null }[];
  // Leads da equipe inteira: o salão não muda com o filtro do quadro.
  leads: LeadResumo[];
  etapas: EtapaResumo[];
  mostrarTodos: boolean;
  responsavelSelecionado: string;
  comemoracao: { id: number; ownerId: string | null; valor: number } | null;
  onSelecionar: (ownerId: string) => void;
  // Botões da página (período, nova etapa, novo lead) no alto da sala.
  acoes?: React.ReactNode;
  // Busca e filtros, numa faixa fina logo abaixo do cabeçalho.
  filtros?: React.ReactNode;
  // O quadro e o corredor ficam dentro da própria sala.
  children?: React.ReactNode;
}

const CAMISAS = ["#ff6500", "#38bdf8", "#22c55e", "#a855f7", "#ffb000", "#f43f5e"];
const CABELOS = ["#2b2118", "#4a2c13", "#1b1b20", "#5c3a1e"];
const MEDALHAS = ["#ffb000", "#cbd5e1", "#b45309"];

// Valores curtos para caber na mesa sem quebrar linha.
const reais = (valor: number) => {
  if (valor >= 1_000_000) {
    return `R$ ${(valor / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  }
  if (valor >= 1_000) {
    return `R$ ${Math.round(valor / 1_000).toLocaleString("pt-BR")} mil`;
  }
  return `R$ ${Math.round(valor).toLocaleString("pt-BR")}`;
};

function corPor(id: string, paleta: string[]) {
  let soma = 0;
  for (const caractere of id) soma += caractere.charCodeAt(0);
  return paleta[soma % paleta.length];
}

// Salão de vendas: a equipe toda em cena, independente do filtro do quadro.
export function SalesFloor({
  usuarios,
  leads,
  etapas,
  mostrarTodos,
  responsavelSelecionado,
  comemoracao,
  onSelecionar,
  acoes,
  filtros,
  children,
}: SalesFloorProps) {
  const vendedores = montarVendedores(usuarios, leads, etapas, mostrarTodos);
  // Sem equipe montada a sala não aparece, mas o funil continua em pé.
  if (!vendedores.length) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {acoes}
        {filtros}
        {children}
      </div>
    );
  }

  const lider = vendedores[0];
  const totalNegociacao = vendedores.reduce((s, v) => s + v.valorEmNegociacao, 0);
  const totalGanho = vendedores.reduce((s, v) => s + v.valorGanhoNoMes, 0);
  const totalAtrasados = vendedores.reduce((s, v) => s + v.atrasados, 0);

  return (
    <section className="jvs-office flex min-h-[calc(100vh-7.5rem)] flex-col border border-white/10">
      <div className="jvs-office__wall" />
      <div className="jvs-office__floor" />
      <div className="jvs-office__spot" style={{ left: "26%", top: "12%" }} />
      <div className="jvs-office__spot" style={{ left: "64%", top: "30%" }} />

      <header className="relative z-30 flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold tracking-tight text-white">
            Salão de vendas
          </p>
          <p className="text-xs text-white/50">
            {mostrarTodos
              ? "Toda a equipe. Clique em uma mesa para filtrar o funil abaixo."
              : "Sua mesa e seus números do mês."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Resumo icone={Users} texto={`${vendedores.length} na equipe`} />
          <Resumo texto={`${reais(totalNegociacao)} em negociação`} cor="#38bdf8" />
          <Resumo texto={`${reais(totalGanho)} ganhos no mês`} cor="#22c55e" />
          {totalAtrasados > 0 && (
            <Resumo
              icone={AlertTriangle}
              texto={`${totalAtrasados} atrasado(s)`}
              cor="#ff2d00"
            />
          )}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
      </header>

      {filtros && <div className="relative z-30 px-5 pt-3">{filtros}</div>}

      {/* mesas de um lado, placar do outro: o placar nunca cobre uma mesa */}
      <div className="relative mt-1 flex shrink-0 flex-col gap-4 px-5 pb-4 pt-6 md:flex-row md:items-start">
        <div className="flex min-w-0 flex-1 items-end gap-5 overflow-x-auto pb-1">
          {vendedores.map((vendedor) => (
            <Mesa
              key={vendedor.id}
              vendedor={vendedor}
              selecionado={responsavelSelecionado === vendedor.id}
              comemorando={comemoracao?.ownerId === vendedor.id}
              valorComemorado={comemoracao?.valor ?? 0}
              chaveComemoracao={comemoracao?.id ?? 0}
              onSelecionar={() => onSelecionar(vendedor.id)}
            />
          ))}
        </div>

        {/* quadro do mês pendurado na parede */}
        {vendedores.length > 1 && (
          <aside className="w-full shrink-0 rounded-xl border border-primary/25 bg-black/65 p-3 backdrop-blur md:w-[214px]">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              <Trophy className="h-3.5 w-3.5" /> Placar do mês
            </p>
            <ul className="mt-2 space-y-1.5">
              {vendedores.slice(0, 3).map((vendedor, posicao) => (
                <li key={vendedor.id} className="flex items-center gap-2 text-[11px]">
                  <span
                    className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold text-black"
                    style={{ background: MEDALHAS[posicao] }}
                  >
                    {posicao + 1}
                  </span>
                  <span className="flex-1 truncate text-white/80">{vendedor.nome}</span>
                  <span className="tabular-nums text-white/60">
                    {reais(vendedor.valorGanhoNoMes)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 border-t border-white/10 pt-2 text-[10px] text-white/45">
              {lider.valorGanhoNoMes > 0
                ? `${lider.nome} lidera com ${lider.ganhosNoMes} fechamento(s).`
                : "Ninguém fechou negócio neste mês ainda."}
            </p>
          </aside>
        )}
      </div>

      {/* painel de trabalho da sala: quadro ou corredor */}
      {children && (
        <div className="relative flex min-h-[320px] flex-1 flex-col border-t border-white/10 bg-black/35 px-4 py-4 backdrop-blur-sm">
          {children}
        </div>
      )}
    </section>
  );
}

function Resumo({
  icone: Icone,
  texto,
  cor = "#94a3b8",
}: {
  icone?: typeof Users;
  texto: string;
  cor?: string;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[11px] text-white/75">
      {Icone ? (
        <Icone className="h-3 w-3" style={{ color: cor }} />
      ) : (
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: cor, boxShadow: `0 0 6px ${cor}` }}
        />
      )}
      {texto}
    </span>
  );
}

function Mesa({
  vendedor,
  selecionado,
  comemorando,
  valorComemorado,
  chaveComemoracao,
  onSelecionar,
}: {
  vendedor: VendedorResumo;
  selecionado: boolean;
  comemorando: boolean;
  valorComemorado: number;
  chaveComemoracao: number;
  onSelecionar: () => void;
}) {
  const [festa, setFesta] = useState(false);

  useEffect(() => {
    if (!comemorando || !chaveComemoracao) return;
    setFesta(true);
    const tempo = window.setTimeout(() => setFesta(false), 2600);
    return () => window.clearTimeout(tempo);
  }, [comemorando, chaveComemoracao]);

  const semLeads = vendedor.emNegociacao === 0 && vendedor.ganhosNoMes === 0;
  const pose = festa
    ? "done"
    : vendedor.atrasados > 0
      ? "alert"
      : vendedor.emNegociacao > 0
        ? "working"
        : "idle";
  const camisa = corPor(vendedor.id, CAMISAS);

  return (
    <button
      type="button"
      onClick={onSelecionar}
      title={`${vendedor.nome} — clique para filtrar o funil`}
      className={`group relative w-[196px] shrink-0 text-left ${semLeads ? "opacity-70" : ""}`}
    >
      {festa && (
        <span
          className="jvs-office__pop whitespace-nowrap text-sm"
          style={{ left: "78%", top: "-6%" }}
        >
          +{reais(valorComemorado)}
        </span>
      )}

      <div className="flex flex-col items-center">
        {/* balão do que está pegando agora */}
        {vendedor.paraHoje > 0 && !festa && (
          <div className="mb-1 rounded-md border border-primary/30 bg-black/70 px-2 py-0.5 text-[10px] text-primary/90">
            {vendedor.paraHoje} follow-up(s) hoje
          </div>
        )}

        <div className="relative -mb-4 flex h-[66px] items-end">
          <PixelWorker pose={pose} shirt={camisa} hair={corPor(vendedor.email, CABELOS)} size={42} />
        </div>

        {/* mesa desenhada */}
        <svg width="150" height="54" viewBox="0 0 150 54" shapeRendering="crispEdges" aria-hidden="true">
          <rect x="44" y="4" width="46" height="26" rx="2" fill="#1b1d24" />
          <rect x="47" y="7" width="40" height="20" fill={semLeads ? "#0d0d10" : "#09131c"} />
          {!semLeads && (
            <g className="jvs-desk__screen-glow">
              <rect x="50" y="10" width="20" height="2" fill={camisa} />
              <rect x="50" y="14" width="30" height="2" fill="rgba(255,176,0,0.7)" />
              <rect x="50" y="18" width="14" height="2" fill="rgba(255,255,255,0.35)" />
            </g>
          )}
          <rect x="63" y="30" width="8" height="4" fill="#15171d" />
          <rect x="8" y="34" width="134" height="7" rx="2" fill="#2a2d3a" />
          <rect x="8" y="34" width="134" height="2" fill="#3a3e4f" />
          <rect x="18" y="41" width="5" height="12" fill="#23262f" />
          <rect x="127" y="41" width="5" height="12" fill="#23262f" />
          {/* pilha de propostas */}
          {vendedor.emNegociacao > 0 && (
            <>
              <rect x="20" y="28" width="16" height="6" fill="#f4f1ea" />
              <rect x="20" y="26" width="16" height="2" fill="#ffffff" />
            </>
          )}
          {vendedor.ganhosNoMes > 0 && (
            <rect x="110" y="27" width="10" height="7" rx="1" fill="#22c55e" opacity="0.85" />
          )}
          <ellipse cx="75" cy="52" rx="58" ry="4" fill="rgba(0,0,0,0.45)" />
        </svg>

        {/* ficha do vendedor */}
        <div
          className={`-mt-1 w-full rounded-xl border px-2.5 py-2 transition ${
            selecionado
              ? "border-primary/70 bg-primary/15"
              : "border-white/10 bg-black/55 group-hover:border-primary/45"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <p className="flex-1 truncate text-[11.5px] font-semibold text-white">
              {vendedor.nome}
            </p>
            {selecionado && <Filter className="h-3 w-3 shrink-0 text-primary" />}
          </div>

          <div className="mt-1.5 space-y-1 text-[10.5px]">
            <Linha
              rotulo="Negociando"
              valor={`${vendedor.emNegociacao} · ${reais(vendedor.valorEmNegociacao)}`}
            />
            <Linha
              rotulo="Ganhos no mês"
              valor={`${vendedor.ganhosNoMes} · ${reais(vendedor.valorGanhoNoMes)}`}
              destaque={vendedor.valorGanhoNoMes > 0}
            />
          </div>

          {vendedor.atrasados > 0 ? (
            <p className="mt-1.5 flex items-center gap-1 rounded-md bg-destructive/15 px-1.5 py-1 text-[10px] text-destructive">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {vendedor.atrasados} atrasado(s)
            </p>
          ) : semLeads ? (
            <p className="mt-1.5 text-[10px] text-white/35">Sem leads no momento.</p>
          ) : (
            <p className="mt-1.5 text-[10px] text-success/80">Follow-ups em dia.</p>
          )}
        </div>
      </div>
    </button>
  );
}

function Linha({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="shrink-0 text-white/40">{rotulo}</span>
      <span
        className={`truncate text-right tabular-nums ${
          destaque ? "font-semibold text-success" : "text-white/75"
        }`}
      >
        {valor}
      </span>
    </div>
  );
}
