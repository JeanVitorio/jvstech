import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Plus, Users } from "lucide-react";
import { AgentDesk } from "./AgentDesk";
import { BossDesk } from "./BossDesk";
import { Bebedouro, PlacaDaParede, Planta } from "./OfficeProps";
import { PixelWorker } from "./PixelWorker";
import { Button } from "@/components/ui/button";
import { botStatusLabel, botVisualStatus } from "@/lib/bots";
import type { BotRuntime } from "@/types/bots";
import "./office.css";

interface AgentOfficeProps {
  runtimes: BotRuntime[];
  leadCounts?: Record<string, number>;
  selectedId?: string;
  criandoDesabilitado?: boolean;
  onSelect: (runtime: BotRuntime) => void;
  onNovoAgente: () => void;
}

interface Ponto {
  x: number;
  y: number;
}

interface Entrega {
  id: number;
  origem: Ponto;
  camisa: string;
  cabelo: string;
  quantidade: number;
}

interface Pop {
  id: number;
  texto: string;
  x: number;
  y: number;
}

const CAMISAS = ["#ff6500", "#38bdf8", "#22c55e", "#a855f7", "#ffb000", "#f43f5e"];
const CABELOS = ["#2b2118", "#4a2c13", "#1b1b20", "#5c3a1e"];
const POR_FILA = 3;
// Altura da sala e altura de cada fila, para a sala não ficar vazia com
// poucos agentes nem apertada com muitos.
const ALTURA_POR_FILAS: Record<number, number> = { 1: 520, 2: 700, 3: 900 };
const FILAS_POR_QUANTIDADE: Record<number, number[]> = {
  1: [86],
  2: [56, 94],
  3: [42, 68, 94],
};
const ALTURA_MESA_CHEFE: Record<number, number> = { 1: 36, 2: 22, 3: 16 };

function corDoAgente(id: string, paleta: string[]) {
  let soma = 0;
  for (const caractere of id) soma += caractere.charCodeAt(0);
  return paleta[soma % paleta.length];
}

// Distribui as mesas em filas, da frente para o fundo da sala.
function posicaoDaMesa(indice: number, total: number): Ponto {
  const filas = Math.max(1, Math.ceil(total / POR_FILA));
  const alturas = FILAS_POR_QUANTIDADE[filas] ?? FILAS_POR_QUANTIDADE[3];
  const fila = Math.floor(indice / POR_FILA);
  const naFila = Math.min(POR_FILA, total - fila * POR_FILA);
  const coluna = indice % POR_FILA;
  return {
    x: ((coluna + 1) * 100) / (naFila + 1),
    y: alturas[Math.min(fila, alturas.length - 1)],
  };
}

export function AgentOffice({
  runtimes,
  leadCounts,
  selectedId,
  criandoDesabilitado,
  onSelect,
  onNovoAgente,
}: AgentOfficeProps) {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [recebendo, setRecebendo] = useState(false);
  const contagemAnterior = useRef<Record<string, number> | null>(null);
  const proximoId = useRef(1);

  const filas = Math.max(1, Math.ceil(runtimes.length / POR_FILA));
  const alturaSala = ALTURA_POR_FILAS[filas] ?? ALTURA_POR_FILAS[3];
  const mesaChefe: Ponto = { x: 50, y: ALTURA_MESA_CHEFE[filas] ?? 16 };

  const mesas = useMemo(
    () =>
      runtimes.map((runtime, indice) => ({
        runtime,
        posicao: posicaoDaMesa(indice, runtimes.length),
        camisa: corDoAgente(runtime.config.id, CAMISAS),
        cabelo: corDoAgente(runtime.config.slug, CABELOS),
        status: botVisualStatus(runtime),
      })),
    [runtimes],
  );

  const resumo = useMemo(() => {
    const conta = { trabalhando: 0, parados: 0, concluidos: 0 };
    for (const mesa of mesas) {
      if (["running", "starting"].includes(mesa.status)) conta.trabalhando += 1;
      else if (mesa.status === "completed") conta.concluidos += 1;
      else conta.parados += 1;
    }
    return conta;
  }, [mesas]);

  const totalLeads = useMemo(
    () => Object.values(leadCounts ?? {}).reduce((soma, valor) => soma + valor, 0),
    [leadCounts],
  );

  function enviarEntrega(indiceMesa: number, quantidade: number) {
    const mesa = mesas[indiceMesa];
    if (!mesa) return;
    setEntregas((atual) => [
      ...atual,
      {
        id: proximoId.current++,
        origem: mesa.posicao,
        camisa: mesa.camisa,
        cabelo: mesa.cabelo,
        quantidade,
      },
    ]);
  }

  // Lead novo no banco: o agente leva os papéis até a mesa do responsável.
  useEffect(() => {
    if (!leadCounts) return;
    const anterior = contagemAnterior.current;
    contagemAnterior.current = { ...leadCounts };
    if (!anterior) return;
    mesas.forEach((mesa, indice) => {
      const agora = leadCounts[mesa.runtime.config.id] ?? 0;
      const antes = anterior[mesa.runtime.config.id] ?? 0;
      if (agora > antes) enviarEntrega(indice, agora - antes);
    });
    // mesas entra na dependência só pela posição; recalcular não dispara entrega
    // porque a comparação usa a contagem anterior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadCounts]);

  function aoEntregar(entrega: Entrega) {
    setRecebendo(true);
    window.setTimeout(() => setRecebendo(false), 1600);
    const id = proximoId.current++;
    setPops((atual) => [
      ...atual,
      { id, texto: `+${entrega.quantidade} leads`, x: mesaChefe.x + 18, y: mesaChefe.y - 16 },
    ]);
    window.setTimeout(
      () => setPops((atual) => atual.filter((pop) => pop.id !== id)),
      1600,
    );
  }

  return (
    <section className="jvs-office flex h-full flex-col border border-white/10">
      <div className="jvs-office__wall" />
      <div className="jvs-office__floor" />
      <div className="jvs-office__spot" style={{ left: "32%", top: "16%" }} />
      <div className="jvs-office__spot" style={{ left: "58%", top: "48%" }} />

      {/* cabeçalho da sala */}
      <header className="relative z-40 flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <div>
          <p className="font-display text-lg font-bold tracking-tight text-white">
            Sala da prospecção
          </p>
          <p className="text-xs text-white/50">
            Cada mesa é um agente. Quando ele encontra leads, leva até o responsável.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Legenda cor="#22c55e" texto={`${resumo.trabalhando} trabalhando`} />
          <Legenda
            cor="#6b7280"
            texto={`${resumo.parados} ${resumo.parados === 1 ? "parado" : "parados"}`}
          />
          <Legenda
            cor="#38bdf8"
            texto={`${resumo.concluidos} ${resumo.concluidos === 1 ? "concluído" : "concluídos"}`}
          />
          {mesas.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-white/15 bg-black/40 text-[11px] text-white/80 hover:bg-black/60"
              onClick={() => enviarEntrega(0, 12)}
            >
              <Play className="h-3 w-3" /> Demonstrar entrega
            </Button>
          )}
          <Button
            size="sm"
            className="h-8 gap-1.5 shadow-glow"
            disabled={criandoDesabilitado}
            onClick={onNovoAgente}
          >
            <Plus className="h-3.5 w-3.5" /> Novo agente
          </Button>
        </div>
      </header>

      {/* sala: cresce para ocupar o espaço disponível na tela */}
      <div
        className="relative mt-2 w-full flex-1"
        style={{ minHeight: alturaSala }}
      >
        <PlacaDaParede />
        <Planta x={5} y={70} />
        <Planta x={95} y={74} />
        <Bebedouro x={10} y={40} />

        <BossDesk
          totalLeads={totalLeads}
          x={mesaChefe.x}
          y={mesaChefe.y}
          recebendo={recebendo}
        />

        {mesas.map((mesa) => {
          const estado = mesa.runtime.checkpoints.scraper?.state ?? {};
          return (
            <AgentDesk
              key={mesa.runtime.config.id}
              name={mesa.runtime.config.name}
              status={mesa.status}
              statusLabel={botStatusLabel(mesa.status)}
              niche={mesa.runtime.config.niche}
              city={estado.cidade_atual || estado.ultima_cidade || ""}
              activity={estado.atividade_atual ?? ""}
              companies={Number(
                estado.total_itens || estado.ultima_cidade_total_empresas || 0,
              )}
              leads={leadCounts?.[mesa.runtime.config.id] ?? 0}
              maxLeads={mesa.runtime.config.max_leads}
              cityIndex={Number(estado.indice_cidade || 0)}
              cityTotal={Number(
                estado.total_cidades || mesa.runtime.config.cities.length || 0,
              )}
              shirt={mesa.camisa}
              hair={mesa.cabelo}
              x={mesa.posicao.x}
              y={mesa.posicao.y}
              selected={selectedId === mesa.runtime.config.id}
              onSelect={() => onSelect(mesa.runtime)}
            />
          );
        })}

        {entregas.map((entrega) => (
          <Entregador
            key={entrega.id}
            destino={{ x: mesaChefe.x - 14, y: mesaChefe.y + 13 }}
            entrega={entrega}
            onEntregar={() => aoEntregar(entrega)}
            onFim={() =>
              setEntregas((atual) => atual.filter((item) => item.id !== entrega.id))
            }
          />
        ))}

        {pops.map((pop) => (
          <span
            key={pop.id}
            className="jvs-office__pop whitespace-nowrap text-sm"
            style={{ left: `${pop.x}%`, top: `${pop.y}%` }}
          >
            {pop.texto}
          </span>
        ))}

        {!mesas.length && (
          <div className="absolute inset-x-0 bottom-24 text-center">
            <Users className="mx-auto h-8 w-8 text-white/25" />
            <p className="mt-2 text-sm text-white/50">
              A sala está vazia. Crie um agente para ocupar a primeira mesa.
            </p>
          </div>
        )}
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

// Faz o trajeto mesa -> responsável -> mesa, carregando os papéis na ida.
function Entregador({
  entrega,
  destino,
  onEntregar,
  onFim,
}: {
  entrega: Entrega;
  destino: Ponto;
  onEntregar: () => void;
  onFim: () => void;
}) {
  const [posicao, setPosicao] = useState<Ponto>(entrega.origem);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const tempos = [
      window.setTimeout(() => setPosicao(destino), 60),
      window.setTimeout(() => {
        setCarregando(false);
        onEntregar();
      }, 2700),
      window.setTimeout(() => setPosicao(entrega.origem), 3300),
      window.setTimeout(() => onFim(), 6200),
    ];
    return () => tempos.forEach((tempo) => window.clearTimeout(tempo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="jvs-courier"
      style={{ left: `${posicao.x}%`, top: `${posicao.y}%` }}
    >
      <PixelWorker
        pose="walking"
        shirt={entrega.camisa}
        hair={entrega.cabelo}
        size={44}
        carrying={carregando}
      />
    </div>
  );
}
