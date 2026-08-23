import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Props = { label?: string; flip?: boolean };

/** Overlay transition placed between every section. */
export function SectionVeil({ label, flip = false }: Props) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".veil-arc",
        { scaleX: 0.35, opacity: 0.2 },
        {
          scaleX: 1,
          opacity: 1,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
        },
      );
      gsap.fromTo(
        ".veil-label",
        { letterSpacing: "0.6em", opacity: 0 },
        {
          letterSpacing: "0.24em",
          opacity: 1,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "center center", scrub: true },
        },
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="relative h-36 overflow-hidden bg-background md:h-44">
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
        <div
          className="veil-arc h-24 w-[110vw] rounded-[50%]"
          style={{
            background: flip
              ? "radial-gradient(closest-side, oklch(0.85 0.15 165 / 55%), transparent 72%)"
              : "radial-gradient(closest-side, oklch(0.78 0.15 215 / 55%), transparent 72%)",
            filter: "blur(14px)",
          }}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-brand opacity-50" />
      {label ? (
        <span className="veil-label label-xs absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background px-5 py-1.5 text-[0.58rem] text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div className="grain pointer-events-none absolute inset-0 opacity-30" />
    </div>
  );
}
