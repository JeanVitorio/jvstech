import { PixelWorker } from "@/components/site/pixel/PixelWorker";
import "@/components/site/pixel/pixel-office.css";

export interface AgenteDaSala {
  nome: string;
  cidade: string;
  camisa: string;
  cabelo: string;
}

interface OfficeSceneProps {
  agentes: AgenteDaSala[];
  altura?: string;
  // Placas com nome e cidade embaixo de cada mesa.
  mostrarPlacas?: boolean;
  rotuloResponsavel?: string;
  descricaoResponsavel?: string;
  tamanho?: "normal" | "compacta";
}

// A sala da prospecção desenhada em CSS e SVG, reaproveitada no topo da
// página e na seção dos agentes.
export function OfficeScene({
  agentes,
  altura = "h-[340px] sm:h-[380px]",
  mostrarPlacas = true,
  rotuloResponsavel = "Responsável",
  descricaoResponsavel = "recebe os leads prontos",
  tamanho = "normal",
}: OfficeSceneProps) {
  const compacta = tamanho === "compacta";
  const tamanhoAgente = compacta ? 34 : 42;
  const tamanhoChefe = compacta ? 38 : 46;

  return (
    <div className={`jvs-site-office relative ${altura}`}>
      <div className="jvs-site-office__wall" />
      <div className="jvs-site-office__floor" />
      <div className="jvs-site-office__spot" style={{ left: "22%", top: "12%" }} />
      <div className="jvs-site-office__spot" style={{ left: "62%", top: "38%" }} />

      {/* mesa do responsável, recebendo os leads */}
      <div className="absolute left-[62%] top-[12%] z-20 -translate-x-1/2">
        <div className="flex flex-col items-center">
          <div className={compacta ? "-mb-4" : "-mb-5"}>
            <PixelWorker pose="done" shirt="#ff6500" hair="#2b2118" size={tamanhoChefe} />
          </div>
          <Mesa escala={compacta ? 0.78 : 1.15} />
          <div className="-mt-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-center">
            <p className="text-[10px] font-semibold text-primary sm:text-[11px]">
              {rotuloResponsavel}
            </p>
            <p className="text-[10px] font-bold text-white sm:text-xs">{descricaoResponsavel}</p>
          </div>
        </div>
      </div>

      {/* mesas dos agentes */}
      <div
        className={`absolute inset-x-0 bottom-4 flex items-end justify-center px-3 ${
          compacta ? "gap-5 sm:gap-8" : "gap-6 px-4 sm:gap-12"
        }`}
      >
        {agentes.map((agente) => (
          <div key={agente.nome} className="flex flex-col items-center">
            <div className={compacta ? "-mb-4" : "-mb-5"}>
              <PixelWorker
                pose="working"
                shirt={agente.camisa}
                hair={agente.cabelo}
                size={tamanhoAgente}
              />
            </div>
            <Mesa escala={compacta ? 0.72 : 1} />
            {mostrarPlacas && (
              <div className="-mt-1 w-[120px] rounded-lg border border-white/10 bg-black/55 px-2 py-1.5 text-center sm:w-[150px]">
                <p className="truncate text-[10px] font-semibold text-white sm:text-[11px]">
                  {agente.nome}
                </p>
                <p className="truncate text-[9px] text-white/45 sm:text-[10px]">{agente.cidade}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* entregador levando os papéis até o responsável */}
      <div className="jvs-site-courier">
        <PixelWorker
          pose="walking"
          shirt="#a855f7"
          hair="#5c3a1e"
          size={compacta ? 32 : 40}
          carrying
        />
      </div>
    </div>
  );
}

// Mesa desenhada no mesmo estilo quadriculado dos personagens.
function Mesa({ escala = 1 }: { escala?: number }) {
  return (
    <svg
      width={150 * escala}
      height={54 * escala}
      viewBox="0 0 150 54"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x="44" y="4" width="46" height="26" rx="2" fill="#1b1d24" />
      <rect x="47" y="7" width="40" height="20" fill="#09131c" />
      <g className="jvs-desk__screen-glow">
        <rect x="50" y="10" width="20" height="2" fill="#ff6500" />
        <rect x="50" y="14" width="30" height="2" fill="rgba(255,176,0,0.7)" />
        <rect x="50" y="18" width="14" height="2" fill="rgba(255,255,255,0.35)" />
      </g>
      <rect x="63" y="30" width="8" height="4" fill="#15171d" />
      <rect x="8" y="34" width="134" height="7" rx="2" fill="#2a2d3a" />
      <rect x="8" y="34" width="134" height="2" fill="#3a3e4f" />
      <rect x="18" y="41" width="5" height="12" fill="#23262f" />
      <rect x="127" y="41" width="5" height="12" fill="#23262f" />
      <rect x="20" y="28" width="16" height="6" fill="#f4f1ea" />
      <rect x="20" y="26" width="16" height="2" fill="#ffffff" />
      <ellipse cx="75" cy="52" rx="58" ry="4" fill="rgba(0,0,0,0.45)" />
    </svg>
  );
}
