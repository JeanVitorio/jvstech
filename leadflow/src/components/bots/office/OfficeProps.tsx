// Enfeites da sala: só ambientação, sem ligação com os dados dos agentes.

export function Planta({ x, y }: { x: number; y: number }) {
  return (
    <div className="jvs-desk" style={{ left: `${x}%`, top: `${y}%`, zIndex: Math.round(y) }}>
      <svg width="44" height="62" viewBox="0 0 22 31" shapeRendering="crispEdges" aria-hidden="true">
        <rect x="9" y="6" width="3" height="14" fill="#2f6b30" />
        <path d="M10 10 L3 7 L4 3 L10 6 Z" fill="#3f8f44" />
        <path d="M11 9 L18 5 L19 9 L12 12 Z" fill="#357a39" />
        <path d="M10 14 L4 13 L5 17 L10 16 Z" fill="#357a39" />
        <path d="M11 13 L17 12 L17 16 L11 15 Z" fill="#3f8f44" />
        <rect x="6" y="20" width="10" height="8" fill="#8a4a2a" />
        <rect x="5" y="19" width="12" height="2" fill="#a05a33" />
        <ellipse cx="11" cy="29" rx="9" ry="2" fill="rgba(0,0,0,0.45)" />
      </svg>
    </div>
  );
}

export function Bebedouro({ x, y }: { x: number; y: number }) {
  return (
    <div className="jvs-desk" style={{ left: `${x}%`, top: `${y}%`, zIndex: Math.round(y) }}>
      <svg width="34" height="58" viewBox="0 0 17 29" shapeRendering="crispEdges" aria-hidden="true">
        <rect x="4" y="1" width="9" height="9" rx="1" fill="#6fc3e8" opacity="0.85" />
        <rect x="5" y="2" width="7" height="7" fill="#a7e0f5" opacity="0.8" />
        <rect x="3" y="10" width="11" height="14" fill="#2b2e3a" />
        <rect x="4" y="13" width="9" height="2" fill="#3a3e4f" />
        <rect x="7" y="17" width="3" height="2" fill="#ff6500" />
        <rect x="2" y="24" width="13" height="3" fill="#23262f" />
        <ellipse cx="8" cy="28" rx="8" ry="2" fill="rgba(0,0,0,0.45)" />
      </svg>
    </div>
  );
}

// Placa na parede do fundo, com a marca.
export function PlacaDaParede() {
  return (
    <div className="pointer-events-none absolute left-[76%] top-[9%] z-10 -translate-x-1/2 text-center">
      <div className="rounded-md border border-primary/30 bg-black/40 px-4 py-1.5">
        <p className="font-display text-[11px] font-bold tracking-[0.35em] text-primary/90">
          JVS LEADFLOW
        </p>
      </div>
    </div>
  );
}
