import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import logoAnim from "@/assets/logo-anim.webm.asset.json";
import { Services } from "./Services";
import { PackScroll } from "./PackScroll";
import { SectionVeil } from "./SectionVeil";

/**
 * Wraps the services section and the method section so the animated brand mark can
 * travel down the lateral of the first one and dock into the second, entirely driven
 * by scroll (both its position and its own animation frames).
 */
export function ChapterTwo() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const mark = root.current!.querySelector<HTMLElement>(".brand-mark")!;
      const video = mark.querySelector("video")!;
      const dock = root.current!.querySelector<HTMLElement>(".logo-dock")!;

      const delta = () => {
        const a = mark.getBoundingClientRect();
        const b = dock.getBoundingClientRect();
        return {
          x: b.left + b.width / 2 - (a.left + a.width / 2),
          y: b.top + b.height / 2 - (a.top + a.height / 2),
        };
      };

      gsap.to(mark, {
        x: () => delta().x,
        y: () => delta().y,
        scale: 0.34,
        rotate: 8,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          endTrigger: ".logo-dock",
          end: "center center",
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (video.duration) video.currentTime = self.progress * video.duration;
          },
        },
      });

      gsap.fromTo(
        ".brand-halo",
        { opacity: 0.15, scale: 0.7 },
        {
          opacity: 0.55,
          scale: 1.2,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            endTrigger: ".logo-dock",
            end: "center center",
            scrub: 0.6,
          },
        },
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="relative">
      {/* brand mark riding the right lateral, scroll-scrubbed */}
      <div className="pointer-events-none absolute right-[3vw] top-[18vh] z-30 hidden md:block">
        <div className="brand-mark relative h-[22vh] w-[22vh]">
          <div className="brand-halo absolute inset-0 rounded-full bg-[radial-gradient(circle,oklch(0.72_0.16_215_/_45%),transparent_68%)]" />
          <video
            className="relative h-full w-full object-contain drop-shadow-[0_0_40px_oklch(0.72_0.16_215_/_55%)]"
            src={logoAnim.url}
            muted
            playsInline
            preload="auto"
          />
        </div>
      </div>

      <Services />
      <SectionVeil label="o método" />
      <PackScroll />
    </div>
  );
}
