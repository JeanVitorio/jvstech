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
        ".veil-sheet",
        { scaleX: 0.2, opacity: 0.15 },
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
          letterSpacing: "0.28em",
          opacity: 1,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "center center", scrub: true },
        },
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="relative h-40 overflow-hidden bg-background md:h-56">
      <div
        className="veil-sheet absolute inset-0 origin-left"
        style={{
          background: flip
            ? "linear-gradient(180deg, oklch(0.13 0.02 240) 0%, oklch(0.17 0.04 200 / 70%) 50%, oklch(0.13 0.02 240) 100%)"
            : "linear-gradient(180deg, oklch(0.13 0.02 240) 0%, oklch(0.19 0.05 250 / 70%) 50%, oklch(0.13 0.02 240) 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--gradient-pelt)] opacity-60" />
      {label ? (
        <span className="veil-label absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-5 text-[0.6rem] rune text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div className="grain pointer-events-none absolute inset-0 opacity-30" />
    </div>
  );
}
