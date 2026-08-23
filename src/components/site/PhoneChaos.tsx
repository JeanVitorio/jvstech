import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const screens = [
  { label: "Loja de moda", metric: "+92%", sub: "vendas mensais", note: "E-commerce refeito do zero" },
  { label: "Indústria", metric: "−87%", sub: "tempo de operação", note: "Sistema interno sob medida" },
  { label: "Clínica", metric: "+8", sub: "contactos por dia", note: "Landing page de captação" },
  { label: "Serviços B2B", metric: "3.4x", sub: "retorno em 90 dias", note: "Site institucional + SEO" },
];

export function PhoneChaos() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from(".chaos-phone", {
        y: 70,
        opacity: 0,
        rotate: -6,
        stagger: 0.1,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 80%" },
      });

      gsap.utils.toArray<HTMLElement>(".chaos-bar").forEach((bar) => {
        gsap.fromTo(
          bar,
          { scaleX: 0 },
          {
            scaleX: 1,
            transformOrigin: "left center",
            duration: 1.1,
            ease: "power3.out",
            scrollTrigger: { trigger: bar, start: "top 92%" },
          },
        );
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
    <section id="resultados" ref={root} className="relative overflow-hidden py-20 md:py-32">
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute right-0 top-1/4 h-96 w-96 rounded-full bg-accent/10 blur-[130px]" />
      <div className="pointer-events-none absolute -left-24 bottom-1/4 h-80 w-80 rounded-full bg-primary/10 blur-[130px]" />

      <div className="relative mx-auto max-w-6xl px-5 text-center md:px-6">
        <p className="label-xs text-primary">◆ Resultados</p>
        <h2 className="mx-auto mt-4 max-w-2xl font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl">
          Alguns dos trabalhos que <span className="text-brand">já fizemos.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[0.8rem] leading-relaxed text-muted-foreground md:text-sm">
          Passe o rato pelos ecrãs — tal como um projeto sem método, tudo se desorganiza.
          E volta ao lugar quando existe estrutura.
        </p>

        <div className="chaos-stage mt-12 grid grid-cols-2 gap-4 md:mt-16 md:grid-cols-4 md:gap-6">
          {screens.map((s) => (
            <div key={s.label} className="chaos-phone will-change-transform">
              <div className="relative mx-auto aspect-[9/17] w-full max-w-[170px] overflow-hidden rounded-[1.9rem] border border-primary/30 bg-[linear-gradient(170deg,oklch(0.22_0.04_235_/_95%),oklch(0.13_0.02_240_/_95%))] p-2.5 shadow-[0_30px_70px_-40px_oklch(0.72_0.16_215_/_90%)]">
                <div className="mx-auto mb-2.5 h-1 w-9 rounded-full bg-border" />
                <div className="flex h-[calc(100%-1.6rem)] flex-col justify-center rounded-[1.4rem] bg-background/70 px-3 text-center">
                  <p className="font-display text-2xl font-semibold text-brand md:text-[1.7rem]">{s.metric}</p>
                  <p className="mt-1 text-[0.58rem] text-muted-foreground">{s.sub}</p>
                  <div className="mt-4 space-y-1.5">
                    <div className="chaos-bar h-1.5 w-full rounded-full bg-brand opacity-80" />
                    <div className="chaos-bar h-1.5 w-2/3 rounded-full bg-primary/30" />
                    <div className="chaos-bar h-1.5 w-5/6 rounded-full bg-primary/20" />
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(ellipse_at_top,oklch(0.72_0.16_215_/_22%),transparent_70%)]" />
              </div>
              <p className="mt-3 font-display text-[0.72rem] font-semibold">{s.label}</p>
              <p className="mt-0.5 text-[0.6rem] text-muted-foreground">{s.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            ["Média de 21 dias", "do briefing ao site no ar"],
            ["100% responsivo", "testado em dispositivos reais"],
            ["Zero surpresa", "escopo e preço fechados antes"],
          ].map(([a, b]) => (
            <div key={a} className="glass-card rounded-2xl p-5 text-left">
              <p className="font-display text-sm font-semibold text-brand">{a}</p>
              <p className="mt-1 text-[0.72rem] text-muted-foreground">{b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
