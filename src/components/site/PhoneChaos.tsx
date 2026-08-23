import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const screens = [
  { label: "Loja de moda", metric: "+92%", sub: "vendas mensais" },
  { label: "Indústria", metric: "−87%", sub: "tempo de operação" },
  { label: "Clínica", metric: "+8", sub: "contactos por dia" },
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
        scrollTrigger: { trigger: root.current, start: "top 78%" },
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
          duration: 0.85,
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
    <section id="resultados" ref={root} className="relative overflow-hidden py-24 md:py-32">
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute right-0 top-1/4 h-96 w-96 rounded-full bg-accent/10 blur-[130px]" />

      <div className="relative mx-auto max-w-6xl px-6 text-center">
        <p className="label-xs text-primary">◆ Resultados</p>
        <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
          Alguns dos trabalhos que <span className="text-brand">já fizemos.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Passe o rato pelos ecrãs — tal como um projeto sem método, tudo se desorganiza.
          E volta ao lugar quando existe estrutura.
        </p>

        <div className="chaos-stage mt-16 grid grid-cols-2 gap-6 md:grid-cols-4">
          {screens.map((s) => (
            <div
              key={s.label}
              className="chaos-phone glass-card relative mx-auto aspect-[9/18] w-full max-w-[170px] overflow-hidden rounded-[1.8rem] p-3 will-change-transform"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
              <div className="flex h-full flex-col justify-center rounded-[1.3rem] bg-background/60 px-3 pb-8 text-center">
                <p className="font-display text-2xl font-semibold text-brand">{s.metric}</p>
                <p className="mt-1 text-[0.6rem] text-muted-foreground">{s.sub}</p>
                <div className="mt-4 space-y-1.5">
                  <div className="h-1.5 w-full rounded-full bg-primary/25" />
                  <div className="h-1.5 w-2/3 rounded-full bg-primary/15" />
                  <div className="h-1.5 w-5/6 rounded-full bg-primary/10" />
                </div>
              </div>
              <span className="absolute inset-x-0 bottom-3 text-[0.6rem] text-muted-foreground">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
