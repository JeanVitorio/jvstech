const items = [
  "Geração automática de leads",
  "Funil de vendas visual",
  "Gestão de colaboradores",
  "Bots de prospecção",
  "Dados centralizados",
];

export function Marquee() {
  const row = [...items, ...items, ...items, ...items];

  return (
    <div className="relative isolate overflow-hidden py-16">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-56 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgb(255_101_0_/_36%),transparent_70%)]" />
      {[
        { rotate: "-2.5deg", dur: "34s", tint: "var(--gradient-brand)", dir: "normal" },
        { rotate: "2.5deg", dur: "44s", tint: "linear-gradient(90deg,#171717,#D93600)", dir: "reverse" },
      ].map((band, i) => (
        <div
          key={i}
          className="relative -my-2 w-[120vw] -translate-x-[8vw] overflow-hidden py-3 shadow-[0_0_40px_-10px_rgb(255_101_0_/_65%)]"
          style={{ transform: `rotate(${band.rotate})`, background: band.tint }}
        >
          <div
            className="flex w-max gap-10 whitespace-nowrap"
            style={{
              animation: `marquee-x ${band.dur} linear infinite`,
              animationDirection: band.dir as "normal" | "reverse",
            }}
          >
            {row.map((t, j) => (
              <span
                key={j}
                className="label-xs text-[0.7rem] text-primary-foreground/90"
                style={i === 1 ? { color: "#F5F5F5" } : undefined}
              >
                {t} <span className="opacity-40">—</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
