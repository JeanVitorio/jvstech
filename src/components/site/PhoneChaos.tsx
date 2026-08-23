import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const screens = [
  { label: "Loja de moda", metric: "+92%", sub: "vendas mensais" },
  { label: "Indústria", metric: "−87%", sub: "tempo de operação" },
  { label: "Clínica", metric: "+8", sub: "leads por dia" },
  { label: "Serviços B2B", metric: "3.4x", sub: "retorno em 90 dias" },
];

export function PhoneChaos() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from(".chaos-phone", {
        y: 60,
        opacity: 0,
        stagger: 0.1,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 75%" },
      });

      const stage = root.current!.querySelector<HTMLElement>(".chaos-stage")!;
      const phones = gsap.utils.toArray<HTMLElement>(".chaos-phone");

      const scatter = () =>
        phones.forEach((p, i) =>
          gsap.to(p, {
            x: gsap.utils.random(-90, 90),
            y: gsap.utils.random(-70, 70),
            rotate: gsap.utils.random(-22, 22),
            scale: gsap.utils.random(0.86, 1.12),
            duration: 0.55,
            delay: i * 0.04,
            ease: "power3.out",
            overwrite: true,
          }),
        );

      const settle = () =>
        gsap.to(phones, {
          x: 0,
          y: 0,
          rotate: 0,
          scale: 1,
          duration: 0.8,
          ease: "elastic.out(1, 0.6)",
          stagger: 0.04,
          overwrite: true,
        });

      stage.addEventListener("mouseenter", scatter);
      stage.addEventListener("mouseleave", settle);
      return () => {
        stage.removeEventListener("mouseenter", scatter);
        stage.removeEventListener("mouseleave", settle);
      };
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="caca" ref={root} className="relative overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="rune text-[0.65rem] text-accent">◆ A caça</p>
          <h2 className="mt-4 font-display text-3xl leading-tight md:text-5xl">
            Não mostramos portfólio. <span className="text-pelt">Mostramos presas.</span>
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            Passe o mouse sobre a matilha de telas — elas se dispersam como lobos assustados
            e voltam à formação. Os números, esses, não saem do lugar.
          </p>
        </div>

        <div className="chaos-stage mt-16 grid grid-cols-2 gap-6 md:grid-cols-4">
          {screens.map((s) => (
            <div
              key={s.label}
              className="chaos-phone relative aspect-[9/18] overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-[var(--glow-ice)] will-change-transform"
            >
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
              <div className="flex h-full flex-col justify-between rounded-xl bg-background/70 p-4">
                <p className="rune text-[0.55rem] text-muted-foreground">{s.label}</p>
                <div>
                  <p className="font-display text-3xl text-pelt">{s.metric}</p>
                  <p className="mt-1 text-[0.7rem] text-muted-foreground">{s.sub}</p>
                </div>
                <div className="space-y-1.5 pb-8">
                  <span className="block h-1.5 w-full rounded bg-primary/30" />
                  <span className="block h-1.5 w-2/3 rounded bg-accent/30" />
                  <span className="block h-1.5 w-1/2 rounded bg-border" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
