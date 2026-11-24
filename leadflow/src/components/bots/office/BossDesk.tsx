import { PixelWorker } from "./PixelWorker";

interface BossDeskProps {
  totalLeads: number;
  x: number;
  y: number;
  recebendo: boolean;
}

// Mesa do responsável: é para cá que os agentes levam os leads encontrados.
export function BossDesk({ totalLeads, x, y, recebendo }: BossDeskProps) {
  // A pilha cresce com o volume, mas para de crescer para não furar a mesa.
  const camadas = Math.min(6, Math.floor(totalLeads / 150) + (totalLeads > 0 ? 1 : 0));

  return (
    <div
      className="jvs-desk"
      style={{ left: `${x}%`, top: `${y}%`, zIndex: Math.round(y) }}
    >
      <div className="relative flex flex-col items-center">
        <div className="relative -mb-6 h-[86px]">
          <PixelWorker pose={recebendo ? "done" : "idle"} shirt="#ff6500" hair="#2b2118" size={54} />
        </div>

        <svg width="170" height="74" viewBox="0 0 170 74" shapeRendering="crispEdges" aria-hidden="true">
          {/* tampo maior, de chefia */}
          <rect x="4" y="40" width="162" height="9" rx="3" fill="#33303a" />
          <rect x="4" y="40" width="162" height="2" fill="#474351" />
          <rect x="16" y="49" width="7" height="22" fill="#282531" />
          <rect x="147" y="49" width="7" height="22" fill="#282531" />

          {/* luminária da mesa */}
          <rect x="24" y="24" width="3" height="16" fill="#3a3e4f" />
          <path d="M18 24 L33 24 L29 16 L22 16 Z" fill="#ff6500" />
          <ellipse cx="25" cy="40" rx="16" ry="4" fill="rgba(255,176,0,0.18)" />

          {/* pilha de leads entregues */}
          {Array.from({ length: camadas }).map((_, i) => (
            <g key={i}>
              <rect x={118} y={36 - i * 4} width="30" height="4" fill="#f4f1ea" />
              <rect x={118} y={36 - i * 4} width="30" height="1" fill="#ffffff" />
            </g>
          ))}
          {camadas > 0 && (
            <rect x={118} y={35 - (camadas - 1) * 4} width="30" height="1" fill="rgba(255,176,0,0.9)" />
          )}

          {/* placa na frente da mesa */}
          <rect x="62" y="44" width="46" height="12" rx="2" fill="#1b1d24" />
          <rect x="66" y="48" width="38" height="2" fill="rgba(255,176,0,0.7)" />

          <ellipse cx="85" cy="72" rx="70" ry="5" fill="rgba(0,0,0,0.5)" />
        </svg>

        <div className="-mt-1 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Mesa do responsável
          </p>
          <p className="text-sm font-bold text-white">
            {totalLeads.toLocaleString("pt-BR")} leads entregues
          </p>
        </div>
      </div>
    </div>
  );
}
