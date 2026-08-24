import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import logoAnim from "@/assets/logo-anim.webm";
import logoAnimMobile from "@/assets/logo-anim-mobile.webp";
import { Services } from "./Services";
import { PackScroll } from "./PackScroll";
import { SectionVeil } from "./SectionVeil";

/**
 * The animated brand mark rides the lateral of the services section and docks in the
 * transition zone right before the method section — same size it started with, driven
 * entirely by scroll (both its travel and its own animation frames).
 */
export function ChapterTwo() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const mark = root.current?.querySelector<HTMLElement>(".brand-mark");
      const dock = root.current?.querySelector<HTMLElement>(".logo-dock");
      if (!mark || !dock) return;
      const video = mark.querySelector("video")!;

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
          opacity: 0.6,
          scale: 1.25,
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
            src={logoAnim}
            muted
            playsInline
            preload="auto"
          />
        </div>
      </div>

      <Services />

      {/* transition zone: the mark parks here, at its original size */}
      <div className="relative">
        <SectionVeil />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="logo-dock absolute left-1/2 top-1/2 h-[22vh] w-[22vh] -translate-x-1/2 -translate-y-1/2" />
          <img
            className="h-[16vh] w-[16vh] object-contain opacity-90 md:hidden"
            src={logoAnimMobile}
            alt=""
            aria-hidden="true"
          />
        </div>
      </div>

      <PackScroll />
    </div>
  );
}
