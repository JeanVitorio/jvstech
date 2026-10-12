import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import matilha from "@/assets/caminhando_com_os_lobos_vermelho_e_branco_ao_lado.mp4";
import logo from "@/assets/logo-jvs-wolf.webp";
import { useVideoVisibility } from "@/hooks/use-video-visibility";

export function FinalCta() {
  const root = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  useVideoVisibility(videoRef);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.from(".cta-copy > *", {
        y: 40,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 72%" },
      });
      gsap.fromTo(
        ".cta-video",
        { yPercent: 12, opacity: 0.4 },
        {
          yPercent: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".cta-video",
            start: "top bottom",
            end: "bottom bottom",
            scrub: true,
          },
        },
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="orcamento" ref={root} className="relative overflow-hidden pt-24">
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative mx-auto grid max-w-5xl gap-5 px-6 md:grid-cols-[1.3fr_1fr]">
        <div className="cta-copy glass-card rounded-2xl p-9">
          <div className="absolute" />
          <p className="label-xs text-primary">◆ Seu próximo lead começa aqui</p>
          <h2 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            Crie sua conta agora e gere seus{" "}
            <span className="text-brand">primeiros leads gratuitamente.</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Você recebe 50 leads por mês no plano Free, sem cadastrar cartão. Quando precisar de
            mais volume, escolha o plano ideal em poucos cliques.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="/LeadFlow/signup?plan=free"
              className="inline-flex items-center rounded-full bg-brand px-8 py-4 text-xs font-semibold text-primary-foreground shadow-[var(--glow-ice)] transition-transform hover:scale-[1.04]"
            >
              Criar minha conta grátis →
            </a>
            <a
              href="https://wa.me/5546991163405?text=Ol%C3%A1%21%20Preciso%20de%20ajuda%20para%20escolher%20um%20plano%20do%20LeadFlow."
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-border px-6 py-4 text-xs font-semibold text-foreground/80 transition-colors hover:border-primary hover:text-primary"
            >
              Falar com um especialista
            </a>
          </div>
        </div>

        <div className="glass-card flex items-center justify-center rounded-2xl p-8">
          <img
            src={logo}
            alt="Marca JVS Tech"
            className="w-40 drop-shadow-[0_0_50px_rgb(255_101_0_/_55%)]"
          />
        </div>
      </div>

      <div className="relative mt-8">
        <video
          ref={videoRef}
          className="cta-video wolf-video mx-auto w-full max-w-5xl"
          src={matilha}
          muted
          loop
          playsInline
          preload="metadata"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,var(--background)_0%,transparent_22%,transparent_62%,var(--background)_97%)]" />
      </div>

      <footer className="relative z-10 mx-auto -mt-16 max-w-6xl px-6 pb-12">
        <div className="grid gap-10 border-t border-border pt-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <img src={logo} alt="" className="h-8 w-8 object-contain" />
              <p className="font-display text-base font-semibold">
                JVS <span className="text-brand">LeadFlow</span>
              </p>
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Prospecção automatizada, gestão de leads e funil de vendas em um único sistema.
            </p>
          </div>
          <div>
            <p className="label-xs text-muted-foreground">Navegação</p>
            <ul className="mt-4 space-y-2 text-xs text-foreground/75">
              <li>
                <a className="hover:text-primary" href="#servicos">
                  Recursos
                </a>
              </li>
              <li>
                <a className="hover:text-primary" href="#metodo">
                  Como funciona
                </a>
              </li>
              <li>
                <a className="hover:text-primary" href="#resultados">
                  Benefícios
                </a>
              </li>
              <li>
                <a className="hover:text-primary" href="#planos">
                  Planos
                </a>
              </li>
              <li>
                <a className="hover:text-primary" href="#faq">
                  FAQ
                </a>
              </li>
              <li>
                <a className="hover:text-primary" href="/LeadFlow/login">
                  Login
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="label-xs text-muted-foreground">Contacto</p>
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
          © 2026 JVS Tech · Todos os direitos reservados.
        </p>
      </footer>
    </section>
  );
}
