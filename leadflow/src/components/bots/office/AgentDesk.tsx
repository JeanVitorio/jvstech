import { PixelWorker, type WorkerPose } from "./PixelWorker";
import type { BotVisualStatus } from "@/lib/bots";

interface AgentDeskProps {
  name: string;
  status: BotVisualStatus;
  statusLabel: string;
  niche: string;
  city: string;
  activity: string;
  companies: number;
  leads: number;
  maxLeads: number | null;
  cityIndex: number;
  cityTotal: number;
  shirt: string;
  hair: string;
  x: number;
  y: number;
  selected: boolean;
  onSelect: () => void;
}

const POSE_POR_STATUS: Record<BotVisualStatus, WorkerPose> = {
  running: "working",
  starting: "walking",
  paused: "idle",
  stopping: "idle",
  completed: "done",
  failed: "alert",
  offline: "away",
  idle: "away",
};

const COR_POR_STATUS: Record<BotVisualStatus, string> = {
  running: "#22c55e",
  starting: "#ffb000",
  paused: "#ffb000",
  stopping: "#ffb000",
  completed: "#38bdf8",
  failed: "#ff2d00",
  offline: "#ff2d00",
  idle: "#6b7280",
};

export function AgentDesk({
  name,
  status,
  statusLabel,
  niche,
  city,
  activity,
  companies,
  leads,
  maxLeads,
  cityIndex,
  cityTotal,
  shirt,
  hair,
  x,
  y,
  selected,
  onSelect,
}: AgentDeskProps) {
  const pose = POSE_POR_STATUS[status];
  const cor = COR_POR_STATUS[status];
  const ligado = status === "running" || status === "starting";
  const vazio = pose === "away";
  const progressoCidades = cityTotal ? Math.round((cityIndex / cityTotal) * 100) : 0;
  const progressoLeads = maxLeads
    ? Math.min(100, Math.round((leads / maxLeads) * 100))
    : 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      title={`${name} — ${statusLabel}. Clique para abrir o agente.`}
      className={`jvs-desk group text-left ${vazio ? "jvs-desk--dim" : ""}`}
      style={{ left: `${x}%`, top: `${y}%`, zIndex: Math.round(y) }}
    >
      <div className="relative flex flex-col items-center">
        {/* balão com a atividade de quem está trabalhando */}
        {ligado && activity && (
          <div className="mb-1 max-w-[168px] truncate rounded-md border border-primary/30 bg-black/70 px-2 py-1 text-[10px] text-primary/90">
            {activity}
          </div>
        )}

        {/* a pessoa fica atrás da mesa; a mesa cobre a parte de baixo */}
        <div className="relative -mb-5 flex h-[72px] items-end">
          {vazio ? (
            <CadeiraVazia />
          ) : (
            <PixelWorker pose={pose} shirt={shirt} hair={hair} size={46} />
          )}
        </div>

        <svg width="118" height="62" viewBox="0 0 118 62" shapeRendering="crispEdges" aria-hidden="true">
          {/* monitor */}
          <rect x="34" y="2" width="50" height="30" rx="2" fill="#1b1d24" />
          <rect x="37" y="5" width="44" height="24" fill={ligado ? "#09131c" : "#0d0d10"} />
          {ligado && (
            <g className="jvs-desk__screen-glow">
              <rect x="40" y="9" width="22" height="2" fill="#ff6500" />
              <rect x="40" y="13" width="34" height="2" fill="rgba(255,176,0,0.75)" />
              <rect x="40" y="17" width="16" height="2" fill="rgba(255,255,255,0.45)" />
              <rect x="40" y="21" width="28" height="2" fill="rgba(255,255,255,0.25)" />
            </g>
          )}
          {!ligado && <rect x="44" y="15" width="30" height="2" fill="rgba(255,255,255,0.08)" />}
          <rect x="55" y="32" width="8" height="4" fill="#15171d" />

          {/* tampo e pés */}
          <rect x="6" y="36" width="106" height="7" rx="2" fill="#2a2d3a" />
          <rect x="6" y="36" width="106" height="2" fill="#3a3e4f" />
          <rect x="14" y="43" width="5" height="16" fill="#23262f" />
          <rect x="99" y="43" width="5" height="16" fill="#23262f" />

          {/* teclado e caneca */}
          <rect x="44" y="33" width="30" height="3" fill="#3a3e4f" />
          <rect x="84" y="29" width="7" height="7" rx="1" fill={cor} opacity="0.85" />

          {/* pilha de leads do próprio agente */}
          {leads > 0 && (
            <g>
              <rect x="18" y="30" width="16" height="6" fill="#f4f1ea" />
              <rect x="18" y="28" width="16" height="2" fill="#ffffff" />
              <rect x="18" y="27" width="16" height="1" fill="rgba(255,176,0,0.9)" />
            </g>
          )}

          <ellipse cx="59" cy="60" rx="46" ry="4" fill="rgba(0,0,0,0.45)" />
        </svg>

        {/* ficha do agente, com o que antes ficava no cartão */}
        <div
          className={`jvs-desk__plate -mt-1 w-[184px] rounded-xl border px-2.5 py-2 transition ${
            selected
              ? "border-primary/70 bg-primary/15"
              : "border-white/10 bg-black/55 group-hover:border-primary/50 group-hover:bg-black/70"
          }`}
        >
          <p className="truncate text-[11.5px] font-semibold text-white">{name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-white/55">
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: cor, boxShadow: `0 0 6px ${cor}` }}
            />
            <span className="truncate">{statusLabel} · {niche}</span>
          </p>

          <div className="mt-1.5 grid grid-cols-2 gap-x-2 text-[10px]">
            <Dado rotulo="Cidade" valor={city || "—"} />
            <Dado rotulo="Empresas" valor={companies.toLocaleString("pt-BR")} />
          </div>

          <div className="mt-1.5 space-y-1">
            <Barra
              rotulo="Cidades"
              texto={cityTotal ? `${cityIndex}/${cityTotal}` : "—"}
              valor={progressoCidades}
              cor="#38bdf8"
            />
            <Barra
              rotulo="Leads"
              texto={
                maxLeads
                  ? `${leads.toLocaleString("pt-BR")}/${maxLeads.toLocaleString("pt-BR")}`
                  : leads.toLocaleString("pt-BR")
              }
              valor={maxLeads ? progressoLeads : leads > 0 ? 100 : 0}
              cor="#ff6500"
            />
          </div>
        </div>
      </div>
    </button>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <p className="text-white/35">{rotulo}</p>
      <p className="truncate text-white/80">{valor}</p>
    </div>
  );
}

function Barra({
  rotulo,
  texto,
  valor,
  cor,
}: {
  rotulo: string;
  texto: string;
  valor: number;
  cor: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-[9.5px] text-white/45">
        <span>{rotulo}</span>
        <span className="text-white/70">{texto}</span>
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${valor}%`, background: cor }}
        />
      </div>
    </div>
  );
}

// Mesa sem ninguém: a cadeira fica virada, como quem saiu.
function CadeiraVazia() {
  return (
    <svg width="34" height="44" viewBox="0 0 17 22" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="3" y="2" width="11" height="9" rx="1" fill="#32353f" />
      <rect x="4" y="3" width="9" height="7" fill="#40445a" />
      <rect x="2" y="11" width="13" height="3" fill="#32353f" />
      <rect x="7" y="14" width="3" height="5" fill="#262933" />
      <rect x="3" y="19" width="11" height="2" fill="#262933" />
    </svg>
  );
}
