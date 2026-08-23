import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import logo from "@/assets/logo-jvs.png.asset.json";

/** Scroll-driven logo bridge sitting between section two and section three. */
export function LogoBridge() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          pin: ".bridge-stage",
          pinSpacing: false,
        },
      });

      tl.fromTo(
        ".bridge-mark",
        { scale: 0.35, opacity: 0, rotate: -18, filter: "blur(14px)" },
        { scale: 1, opacity: 1, rotate: 0, filter: "blur(0px)", ease: "power2.out", duration: 1.1 },
      )
        .fromTo(".bridge-ring", { scale: 0.4, opacity: 0 }, { scale: 1.35, opacity: 0.5, duration: 1.1 }, 0)
        .fromTo(".bridge-word", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, 0.5)
        .to(".bridge-mark", { scale: 6.5, opacity: 0, filter: "blur(10px)", ease: "power2.in", duration: 1.2 }, 1.5)
        .to(".bridge-word", { opacity: 0, y: -30, duration: 0.5 }, 1.5)
        .to(".bridge-ring", { scale: 4, opacity: 0, duration: 1.2 }, 1.5)
        .fromTo(".bridge-flash", { opacity: 0 }, { opacity: 1, duration: 0.6 }, 2.2);
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="relative h-[280vh] bg-background">
      <div className="bridge-stage relative flex h-screen w-full items-center justify-center overflow-hidden">
        <div className="bridge-ring absolute h-[46vmin] w-[46vmin] rounded-full border border-primary/40 shadow-[var(--glow-ice)]" />
        <img
          src={logo.url}
          alt="Marca JVS: cabeça de lobo formada pelas letras J e V"
          className="bridge-mark w-[34vmin] max-w-[420px] drop-shadow-[0_0_60px_oklch(0.75_0.16_200_/_0.45)]"
        />
        <p className="bridge-word absolute bottom-[18vh] max-w-md px-6 text-center text-sm leading-relaxed text-muted-foreground">
          <span className="block rune mb-3 text-[0.6rem] text-primary">A marca do bando</span>
          Quem anda sozinho corre. Quem anda em alcateia domina o território.
        </p>
        <div className="bridge-flash pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,oklch(0.85_0.12_200_/_0.25),transparent_65%)] opacity-0" />
      </div>
    </div>
  );
}
