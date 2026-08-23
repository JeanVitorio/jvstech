import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import matilha from "@/assets/caminhando_com_os_lobos_vermelho_e_branco_ao_lado.mp4.asset.json";

export function FinalHowl() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from(".howl-copy > *", {
        y: 40,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 70%" },
      });
      gsap.fromTo(
        ".howl-video",
        { yPercent: 14, opacity: 0.5 },
        {
          yPercent: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: true },
        },
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="uivo" ref={root} className="relative overflow-hidden pt-24">
      <div className="howl-copy relative z-10 mx-auto max-w-3xl px-6 text-center">
        <p className="rune text-[0.65rem] text-primary">◆ Último uivo</p>
        <h2 className="mt-4 font-display text-3xl leading-tight md:text-5xl">
          Se o seu site não caça, ele é <span className="text-pelt">presa</span>.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Chame a alcateia no WhatsApp. Diagnóstico gratuito, sem compromisso, e em até
          24h você recebe o plano de ação para vender mais.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <a
            href="https://wa.me/5546991163405"
            className="inline-flex items-center rounded-sm bg-primary px-9 py-4 text-xs rune text-primary-foreground shadow-[var(--glow-moss)] transition-transform hover:scale-[1.03]"
          >
            Quero um site que caça
          </a>
          <p className="text-[0.7rem] text-muted-foreground">
            Resposta em até 2h · Apenas 4 vagas por mês
          </p>
        </div>
      </div>

      <div className="relative mt-10">
        <video
          className="howl-video wolf-video mx-auto w-full max-w-5xl"
          src={matilha.url}
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,var(--background)_0%,transparent_25%,transparent_60%,var(--background)_97%)]" />
      </div>

      <footer className="relative z-10 mx-auto -mt-16 max-w-6xl px-6 pb-12">
        <div className="grid gap-10 border-t border-border pt-10 md:grid-cols-3">
          <div>
            <p className="font-display text-lg">
              JVS<span className="text-pelt"> Alcateia</span>
            </p>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Sites e sistemas sob medida focados em conversão. Construímos máquinas que
              vendem todos os dias.
            </p>
          </div>
          <div>
            <p className="rune text-[0.6rem] text-muted-foreground">Navegação</p>
            <ul className="mt-4 space-y-2 text-xs text-foreground/75">
              <li><a className="hover:text-primary" href="#matilha">Serviços</a></li>
              <li><a className="hover:text-primary" href="#rastro">Processo</a></li>
              <li><a className="hover:text-primary" href="#caca">Cases</a></li>
              <li><a className="hover:text-primary" href="#uivo">Contato</a></li>
            </ul>
          </div>
          <div>
            <p className="rune text-[0.6rem] text-muted-foreground">Contato</p>
            <ul className="mt-4 space-y-2 text-xs text-foreground/75">
              <li>
                <a className="hover:text-primary" href="https://wa.me/5546991163405">
                  WhatsApp · (46) 99116-3405
                </a>
              </li>
              <li>Atendimento online · Brasil</li>
            </ul>
          </div>
        </div>
        <p className="mt-10 text-[0.65rem] text-muted-foreground">
          © 2026 JVS Soluções. Sites e sistemas que caçam.
        </p>
      </footer>
    </section>
  );
}
