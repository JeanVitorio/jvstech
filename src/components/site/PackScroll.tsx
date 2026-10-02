import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import wolfSide from "@/assets/caminhando_de_lado.webm";
import wolfSideMobile from "@/assets/caminhando-de-lado-mobile.webp";
import { useIsMobile } from "@/hooks/use-mobile";

const cards = [
  {
    n: "01",
    t: "Defina o público",
    d: "Configure o segmento, a localização e os critérios das empresas que deseja encontrar.",
  },
  {
    n: "02",
    t: "Crie o bot",
    d: "Salve a estratégia de prospecção e escolha o colaborador responsável pelos novos leads.",
  },
  {
    n: "03",
    t: "Inicie a busca",
    d: "O aplicativo executa a automação e pesquisa empresas dentro dos filtros definidos.",
  },
  {
    n: "04",
    t: "Receba os leads",
    d: "Os contatos encontrados são enviados diretamente para o banco de dados da operação.",
  },
  {
    n: "05",
    t: "Qualifique",
    d: "Revise as informações e concentre o esforço comercial nas oportunidades mais relevantes.",
  },
  {
    n: "06",
    t: "Distribua",
    d: "Organize os responsáveis e mantenha cada lead com o colaborador que fará o atendimento.",
  },
  {
    n: "07",
    t: "Acompanhe o funil",
    d: "Mova as negociações pelas etapas e veja com clareza onde cada oportunidade está.",
  },
  {
    n: "08",
    t: "Converta mais",
    d: "Use os dados da operação para ajustar a prospecção e repetir o que gera resultado.",
  },
];

export function PackScroll() {
  const root = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const section = root.current;

      if (!section) return;

      const track =
        section.querySelector<HTMLElement>(".pack-track");

      const video = videoRef.current;

      if (!track) return;

      const finalCard = track.children.item(
        cards.length - 1
      ) as HTMLElement | null;

      if (!finalCard) return;

      const wolfTravel = 220;
      let paw = 0;
      let lastProgress = 0;
      let skipReturn = false;
      let packTween: gsap.core.Tween | null = null;

      /*
       * Recoloca os cartões e o lobo no início sem alterar
       * a posição atual da página.
       */
      const resetMethod = () => {
        paw = 0;
        lastProgress = 0;

        if (video && video.readyState >= 1) {
          video.currentTime = 0;
        }

        packTween?.progress(0);
        gsap.set(track, { x: 0 });
        gsap.set(".pack-wolf", {
          x: -wolfTravel / 2,
          y: 0,
          autoAlpha: 1,
        });
      };

      /*
       * Garante que o navegador carregue os metadados
       * antes de tentarmos controlar o currentTime.
       */
      const prepareVideo = () => {
        if (video && video.readyState >= 1) {
          video.currentTime = 0;
        }
      };

      if (video && video.readyState >= 1) {
        prepareVideo();
      } else if (video) {
        video.addEventListener("loadedmetadata", prepareVideo);
      }

      /*
       * Encerra o percurso com o lobo centralizado sobre
       * o cartão 08, sem avançar para o próximo ciclo.
       */
      const distance = () => {
        const finalWolfX =
          section.clientWidth / 2 + wolfTravel / 2;
        const finalCardX =
          finalCard.offsetLeft + finalCard.offsetWidth / 2;

        return Math.max(0, finalCardX - finalWolfX);
      };

      /*
       * Movimento horizontal dos cards.
       */
      packTween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",

        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance() * 1.25}`,

          pin: true,
          scrub: 0.4,

          invalidateOnRefresh: true,
          anticipatePin: 1,

          onUpdate: (self) => {
            /*
             * Depois do reset em Resultados, mantém o método
             * no cartão 01 durante o retorno rápido.
             */
            if (skipReturn && self.direction < 0) {
              resetMethod();
              return;
            }

            /*
             * O lobo continua andando para frente
             * acompanhando o movimento do scroll.
             */
            paw += Math.abs(self.progress - lastProgress) * 14;

            lastProgress = self.progress;

            /*
             * Controla o frame do vídeo de acordo
             * com o movimento do scroll.
             */
            if (
              video &&
              video.readyState >= 2 &&
              Number.isFinite(video.duration) &&
              video.duration > 0
            ) {
              video.currentTime =
                (paw * video.duration) % video.duration;
            }

            /*
             * Pequeno deslocamento vertical para dar
             * sensação de caminhada.
             */
            gsap.set(".pack-wolf", {
              x: (self.progress - 0.5) * wolfTravel,
              y: Math.sin(paw * Math.PI * 2) * 6,
            });
          },
          onEnterBack: (self) => {
            if (skipReturn) {
              resetMethod();
              skipReturn = false;

              window.requestAnimationFrame(() => {
                window.scrollTo({
                  top: Math.max(0, self.start + 1),
                  behavior: "auto",
                });
              });

              return;
            }

            lastProgress = self.progress;
          },
        },
      });

      /*
       * Quando Resultados chega ao centro, prepara o método
       * para reaparecer no cartão 01 durante a subida.
       */
      ScrollTrigger.create({
        trigger: "#resultados",
        start: "center center",
        onEnter: () => {
          skipReturn = true;
          resetMethod();
        },
      });

      /*
       * Entrada do título.
       */
      gsap.from(".pack-head > *", {
        y: 28,
        opacity: 0,
        stagger: 0.1,
        duration: 0.8,
        ease: "power3.out",

        scrollTrigger: {
          trigger: section,
          start: "top 70%",
        },
      });

      /*
       * Atualiza o ScrollTrigger quando os vídeos
       * e outros elementos terminarem de carregar.
       */
      window.addEventListener("load", () => {
        ScrollTrigger.refresh();
      });

      ScrollTrigger.refresh();

      return () => {
        video?.removeEventListener(
          "loadedmetadata",
          prepareVideo
        );

        window.removeEventListener("load", () => {
          ScrollTrigger.refresh();
        });
      };
    }, root);

    return () => ctx.revert();
  }, [isMobile]);

  /*
   * Duplica os cards para criar o efeito de loop.
   */
  const loop = [...cards, ...cards];

  return (
    <section
      id="metodo"
      ref={root}
      className="relative h-screen overflow-hidden bg-background"
    >
      {/* Grid tecnológico */}
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-40" />

      {/* Glow central */}
      <div className="pointer-events-none absolute inset-x-0 top-1/4 h-[50vh] bg-[radial-gradient(ellipse_at_center,rgb(255_45_0_/_24%),transparent_70%)]" />

      {/* Título */}
      <div className="pack-head absolute left-5 right-5 top-[13vh] z-20 max-w-sm md:left-16 md:right-auto">
        <p className="label-xs text-primary">
          ◆ Como funciona
        </p>

        <h2 className="mt-3 font-display text-xl font-semibold leading-tight tracking-tight sm:text-2xl md:text-4xl">
          Um fluxo contínuo da busca até o{" "}
          <span className="text-brand">
            fechamento da venda.
          </span>
        </h2>

        <p className="mt-3 text-[0.72rem] leading-relaxed text-muted-foreground md:text-xs">
          Oito etapas conectam automação, equipe e acompanhamento.
          Role para o lado para conhecer o fluxo completo.
        </p>
      </div>

      {/* Área dos cards */}
      <div className="absolute inset-x-0 bottom-[8vh] md:bottom-[10vh]">
        <div className="pack-track relative flex w-max gap-4 px-[8vw] will-change-transform md:gap-6">
          {loop.map((c, i) => (
            <article
              key={i}
              className="glass-card group relative h-[32vh] w-[76vw] shrink-0 overflow-hidden rounded-2xl p-5 transition-colors hover:border-primary/60 sm:w-[46vw] md:h-[34vh] md:p-7 lg:w-[25vw]"
            >
              <span className="font-display text-3xl font-bold text-primary/25 transition-colors group-hover:text-primary/60 md:text-4xl">
                {c.n}
              </span>

              <h3 className="mt-1 font-display text-base font-semibold md:text-lg">
                {c.t}
              </h3>

              <p className="mt-3 text-[0.75rem] leading-relaxed text-muted-foreground md:text-xs">
                {c.d}
              </p>

              <div className="absolute bottom-0 left-0 h-px w-0 bg-brand transition-all duration-500 group-hover:w-full" />
            </article>
          ))}
        </div>

        {/* =====================================================
            LOBO
            ===================================================== */}
        <div
          className="
            pack-wolf
            pointer-events-none
            absolute
            bottom-[32vh]
            left-1/2
            z-30
            -translate-x-1/2
            md:bottom-[34vh]
          "
        >
          {isMobile ? (
            <img
              className="
                fire-media
                block
                h-[16vh]
                w-auto
                object-contain
                drop-shadow-[0_18px_30px_rgb(5_5_5_/_85%)]
                md:hidden
              "
              src={wolfSideMobile}
              alt=""
              aria-hidden="true"
            />
          ) : (
            <video
              ref={videoRef}
              className="
                fire-media
                hidden
                w-auto
                object-contain
                drop-shadow-[0_18px_30px_rgb(5_5_5_/_85%)]
                md:block
                md:h-[26vh]
              "
              src={wolfSide}
              muted
              playsInline
              preload="metadata"
            />
          )}

          {/* Sombra/glow abaixo das patas */}
          <div
            className="
              mx-auto
              -mt-3
              h-3
              w-[70%]
              rounded-[50%]
              bg-[radial-gradient(ellipse_at_center,rgb(255_101_0_/_50%),transparent_70%)]
              blur-[2px]
            "
          />
        </div>
      </div>
    </section>
  );
}