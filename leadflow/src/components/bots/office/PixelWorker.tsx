export type WorkerPose = "working" | "idle" | "walking" | "done" | "alert" | "away";

interface PixelWorkerProps {
  pose: WorkerPose;
  shirt: string;
  hair: string;
  size?: number;
  carrying?: boolean;
}

const SKIN = "#e8b58a";
const SKIN_DARK = "#c99467";
const SHOE = "#1b1b20";

// Personagem desenhado quadradinho a quadradinho, no estilo do escritório
// pixelado, mas com a paleta da marca.
export function PixelWorker({
  pose,
  shirt,
  hair,
  size = 56,
  carrying = false,
}: PixelWorkerProps) {
  if (pose === "away") return null;

  const classe = {
    working: "jvs-worker jvs-worker--working",
    idle: "jvs-worker jvs-worker--idle",
    walking: "jvs-worker jvs-worker--walking",
    done: "jvs-worker jvs-worker--done",
    alert: "jvs-worker jvs-worker--alert",
    away: "jvs-worker",
  }[pose];

  // Sentado some com as pernas: a cadeira cobre essa parte.
  const sentado = pose === "working";

  return (
    <svg
      className={classe}
      width={size}
      height={size * 1.5}
      viewBox="0 0 16 24"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {/* cabelo */}
      <rect x="4" y="1" width="8" height="3" fill={hair} />
      <rect x="3" y="2" width="1" height="3" fill={hair} />
      <rect x="12" y="2" width="1" height="3" fill={hair} />
      {/* rosto */}
      <rect x="4" y="4" width="8" height="5" fill={SKIN} />
      <rect x="4" y="8" width="8" height="1" fill={SKIN_DARK} />
      {/* olhos */}
      <rect x="6" y="6" width="1" height="1" fill="#1b1b20" />
      <rect x="9" y="6" width="1" height="1" fill="#1b1b20" />
      {pose === "done" && <rect x="6" y="8" width="4" height="1" fill="#1b1b20" />}

      {/* tronco */}
      <rect x="4" y="9" width="8" height="6" fill={shirt} />
      <rect x="4" y="14" width="8" height="1" fill="rgba(0,0,0,0.25)" />
      {/* crachá */}
      <rect x="9" y="10" width="2" height="2" fill="#ffb000" />

      {/* braços */}
      <g className="jvs-worker__arm jvs-worker__arm-left">
        <rect x="2" y="9" width="2" height="5" fill={shirt} />
        <rect x="2" y="13" width="2" height="2" fill={SKIN} />
      </g>
      <g className="jvs-worker__arm jvs-worker__arm-right">
        <rect x="12" y="9" width="2" height="5" fill={shirt} />
        <rect x="12" y="13" width="2" height="2" fill={SKIN} />
      </g>

      {/* papéis na mão, quando está levando os leads */}
      {carrying && (
        <g className="jvs-papers">
          <rect x="3" y="12" width="10" height="5" fill="#f4f1ea" />
          <rect x="3" y="12" width="10" height="1" fill="#ffffff" />
          <rect x="4" y="14" width="6" height="1" fill="#b9b2a4" />
          <rect x="4" y="16" width="8" height="1" fill="#b9b2a4" />
          <rect x="2" y="11" width="12" height="1" fill="rgba(255,176,0,0.9)" />
        </g>
      )}

      {/* pernas */}
      {!sentado && (
        <>
          <g className="jvs-worker__leg-left">
            <rect x="4" y="15" width="3" height="6" fill="#2b2f45" />
            <rect x="4" y="21" width="3" height="2" fill={SHOE} />
          </g>
          <g className="jvs-worker__leg-right">
            <rect x="9" y="15" width="3" height="6" fill="#2b2f45" />
            <rect x="9" y="21" width="3" height="2" fill={SHOE} />
          </g>
        </>
      )}
      {sentado && (
        <>
          <rect x="4" y="15" width="8" height="3" fill="#2b2f45" />
          <rect x="3" y="18" width="10" height="2" fill="#1f2232" />
        </>
      )}
    </svg>
  );
}
