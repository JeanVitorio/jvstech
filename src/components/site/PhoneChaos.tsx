import { useEffect, useRef } from "react";
import gsap from "gsap";

const screens = [
  {
    label: "Loja de moda",
    metric: "+92%",
    sub: "vendas mensais",
    note: "E-commerce refeito do zero",
  },
  {
    label: "Indústria",
    metric: "−87%",
    sub: "tempo de operação",
    note: "Sistema interno sob medida",
  },
  {
    label: "Clínica",
    metric: "+8",
    sub: "contactos por dia",
    note: "Landing page de captação",
  },
  {
    label: "Serviços B2B",
    metric: "3.4x",
    sub: "retorno em 90 dias",
    note: "Site institucional + SEO",
  },
];

export function PhoneChaos() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = root.current;

    if (!section) return;

    const stage =
      section.querySelector<HTMLElement>(".chaos-stage");

    const phones =
      section.querySelectorAll<HTMLElement>(".chaos-phone");

    if (!stage || phones.length === 0) return;

    /*
     * ============================================================
     * TODOS OS CARDS COMEÇAM 100% VISÍVEIS
     * ============================================================
     */

    gsap.set(phones, {
      opacity: 1,
      visibility: "visible",
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
    });

    /*
     * ============================================================
     * EFEITO DE CAOS AO PASSAR O MOUSE
     * ============================================================
     */

    const scatter = () => {
      phones.forEach((phone, index) => {
        gsap.to(phone, {
          x: gsap.utils.random(-70, 70),
          y: gsap.utils.random(-50, 50),
          rotate: gsap.utils.random(-12, 12),
          scale: gsap.utils.random(0.96, 1.04),
          duration: 0.45,
          delay: index * 0.03,
          ease: "power3.out",
          overwrite: true,
        });
      });
    };

    /*
     * ============================================================
     * VOLTAR PARA A POSIÇÃO ORIGINAL
     * ============================================================
     */

    const settle = () => {
      gsap.to(phones, {
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        duration: 0.65,
        ease: "power3.out",
        stagger: 0.03,
        overwrite: true,
      });
    };

    stage.addEventListener("mouseenter", scatter);
    stage.addEventListener("mouseleave", settle);

    return () => {
      stage.removeEventListener("mouseenter", scatter);
      stage.removeEventListener("mouseleave", settle);
    };
  }, []);

  return (
    <section
      id="resultados"
      ref={root}
      className="relative overflow-hidden py-20 md:py-32"
    >
      {/* ====================================================== */}
      {/* BACKGROUND */}
      {/* ====================================================== */}

      <div className="tech-grid pointer-events-none absolute inset-0 opacity-40" />

      <div className="pointer-events-none absolute right-0 top-1/4 h-96 w-96 rounded-full bg-accent/10 blur-[130px]" />

      <div className="pointer-events-none absolute -left-24 bottom-1/4 h-80 w-80 rounded-full bg-primary/10 blur-[130px]" />

      {/* ====================================================== */}
      {/* CONTEÚDO */}
      {/* ====================================================== */}

      <div className="relative z-10 mx-auto max-w-6xl px-5 text-center md:px-6">

        {/* TÍTULO */}

        <p className="label-xs text-primary">
          ◆ Resultados
        </p>

        <h2 className="mx-auto mt-4 max-w-2xl font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl md:text-4xl">
          Alguns dos trabalhos que{" "}
          <span className="text-brand">
            já fizemos.
          </span>
        </h2>

        <p className="mx-auto mt-4 max-w-lg text-[0.8rem] leading-relaxed text-muted-foreground md:text-sm">
          Passe o mouse pelos ecrãs tal como um projeto sem
          método, tudo se desorganiza. E volta ao lugar quando
          existe estrutura.
        </p>

        {/* ====================================================== */}
        {/* CARDS */}
        {/* ====================================================== */}

        <div className="chaos-stage mt-12 grid grid-cols-2 gap-4 md:mt-16 md:grid-cols-4 md:gap-6">

          {screens.map((s) => (
            <div
              key={s.label}
              className="
                chaos-phone
                relative
                overflow-hidden
                rounded-3xl
                border
                border-primary/50
                bg-[linear-gradient(145deg,oklch(0.27_0.055_235_/_100%),oklch(0.18_0.035_240_/_100%))]
                p-4
                opacity-100
                shadow-[0_25px_70px_-25px_oklch(0.72_0.16_215_/_70%)]
                transition-shadow
                duration-300
                hover:border-primary
                hover:shadow-[0_30px_90px_-25px_oklch(0.72_0.16_215_/_95%)]
                md:p-5
              "
            >

              {/* Glow do card */}

              <div
                className="
                  pointer-events-none
                  absolute
                  inset-0
                  rounded-3xl
                  bg-[radial-gradient(circle_at_50%_0%,oklch(0.72_0.16_215_/_18%),transparent_55%)]
                "
              />

              {/* ================================================= */}
              {/* CABEÇALHO DO CARD */}
              {/* ================================================= */}

              <div className="relative mb-4 flex items-center justify-between">

                <span className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-primary">
                  Projeto
                </span>

                <span className="h-2 w-2 rounded-full bg-brand shadow-[0_0_12px_oklch(0.72_0.16_215_/_100%)]" />

              </div>

              {/* ================================================= */}
              {/* CELULAR */}
              {/* ================================================= */}

              <div
                className="
                  relative
                  mx-auto
                  aspect-[9/17]
                  w-full
                  max-w-[170px]
                  overflow-hidden
                  rounded-[1.9rem]
                  border
                  border-primary/60
                  bg-[linear-gradient(160deg,oklch(0.42_0.075_235_/_100%),oklch(0.25_0.045_240_/_100%))]
                  p-2.5
                  shadow-[0_25px_60px_-20px_oklch(0.72_0.16_215_/_90%)]
                "
              >

                {/* Speaker */}

                <div className="mx-auto mb-2.5 h-1 w-9 rounded-full bg-white/50" />

                {/* Tela */}

                <div
                  className="
                    flex
                    h-[calc(100%-1.6rem)]
                    flex-col
                    justify-center
                    rounded-[1.4rem]
                    border
                    border-white/20
                    bg-[linear-gradient(145deg,oklch(0.31_0.05_235_/_100%),oklch(0.22_0.035_240_/_100%))]
                    px-3
                    text-center
                  "
                >

                  {/* Métrica */}

                  <p className="font-display text-2xl font-bold text-brand drop-shadow-[0_0_14px_oklch(0.72_0.16_215_/_60%)] md:text-[1.7rem]">
                    {s.metric}
                  </p>

                  {/* Sub */}

                  <p className="mt-1 text-[0.62rem] font-medium text-white/85">
                    {s.sub}
                  </p>

                  {/* Barras */}

                  <div className="mt-5 space-y-2">

                    <div className="h-1.5 w-full rounded-full bg-brand shadow-[0_0_10px_oklch(0.72_0.16_215_/_60%)]" />

                    <div className="h-1.5 w-2/3 rounded-full bg-primary/75" />

                    <div className="h-1.5 w-5/6 rounded-full bg-primary/55" />

                  </div>

                </div>

                {/* Glow */}

                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_at_top,oklch(0.72_0.16_215_/_40%),transparent_70%)]" />

                {/* Reflexo */}

                <div className="pointer-events-none absolute left-3 top-10 h-32 w-8 rotate-[20deg] rounded-full bg-white/[0.08] blur-xl" />

              </div>

              {/* ================================================= */}
              {/* NOME */}
              {/* ================================================= */}

              <p className="relative mt-4 font-display text-[0.78rem] font-semibold text-white">
                {s.label}
              </p>

              {/* ================================================= */}
              {/* DESCRIÇÃO */}
              {/* ================================================= */}

              <p className="relative mt-1 text-[0.63rem] leading-relaxed text-white/70">
                {s.note}
              </p>

            </div>
          ))}

        </div>

        {/* ====================================================== */}
        {/* INFORMAÇÕES INFERIORES */}
        {/* ====================================================== */}

        <div className="mt-14 grid gap-4 sm:grid-cols-3">

          <div className="glass-card rounded-2xl border border-primary/25 bg-primary/[0.06] p-5 text-left">
            <p className="font-display text-sm font-semibold text-brand">
              Média de 21 dias
            </p>

            <p className="mt-1 text-[0.72rem] text-muted-foreground">
              do briefing ao site no ar
            </p>
          </div>

          <div className="glass-card rounded-2xl border border-primary/25 bg-primary/[0.06] p-5 text-left">
            <p className="font-display text-sm font-semibold text-brand">
              100% responsivo
            </p>

            <p className="mt-1 text-[0.72rem] text-muted-foreground">
              testado em dispositivos reais
            </p>
          </div>

          <div className="glass-card rounded-2xl border border-primary/25 bg-primary/[0.06] p-5 text-left">
            <p className="font-display text-sm font-semibold text-brand">
              Zero surpresa
            </p>

            <p className="mt-1 text-[0.72rem] text-muted-foreground">
              escopo e preço fechados antes
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}