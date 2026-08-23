const items = [
  "Resposta em menos de 24h",
  "Orçamento grátis",
  "Otimizado para o Google",
  "Feito à sua medida",
  "Suporte após o lançamento",
];

export function Marquee() {
  const row = [...items, ...items, ...items, ...items];

  return (
    <div className="relative isolate overflow-hidden py-16">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-56 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,oklch(0.72_0.16_215_/_35%),transparent_70%)]" />
      {[
        { rotate: "-2.5deg", dur: "34s", tint: "var(--gradient-brand)", dir: "normal" },
        { rotate: "2.5deg", dur: "44s", tint: "linear-gradient(90deg,oklch(0.3 0.06 240),oklch(0.4 0.09 200))", dir: "reverse" },
      ].map((band, i) => (
        <div
          key={i}
          className="relative -my-2 w-[120vw] -translate-x-[8vw] overflow-hidden py-3 shadow-[0_0_40px_-10px_oklch(0.72_0.16_215_/_60%)]"
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
                style={i === 1 ? { color: "oklch(0.95 0.02 220)" } : undefined}
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
