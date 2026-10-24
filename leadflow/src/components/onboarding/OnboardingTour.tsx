import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useAppInstallation } from "@/hooks/useBots";
import { isValidBrazilianWhatsapp } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { tourSteps } from "./tourSteps";
import { useTargetRect } from "./useTargetRect";

const CARD_WIDTH = 360;
const SPOT_PADDING = 8;
const GAP = 16;
const MARGIN = 16;

type Placement = "center" | "right" | "bottom" | "top";

// Calcula onde o balão e a seta ficam em relação ao elemento destacado.
function computeLayout(rect: DOMRect | null, cardHeight: number) {
  const width = Math.min(CARD_WIDTH, window.innerWidth - MARGIN * 2);
  if (!rect) return { placement: "center" as Placement, card: {}, arrow: {} };

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(value, Math.max(min, max)));
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  if (window.innerWidth - rect.right - SPOT_PADDING - GAP >= width + MARGIN) {
    const top = clamp(centerY - cardHeight / 2, MARGIN, window.innerHeight - cardHeight - MARGIN);
    return {
      placement: "right" as Placement,
      card: { top, left: rect.right + SPOT_PADDING + GAP },
      arrow: { top: clamp(centerY - top - 7, 20, cardHeight - 34) },
    };
  }

  const left = clamp(centerX - width / 2, MARGIN, window.innerWidth - width - MARGIN);
  const below = rect.bottom + SPOT_PADDING + GAP;
  const fitsBelow = below + cardHeight + MARGIN <= window.innerHeight;
  return {
    placement: (fitsBelow ? "bottom" : "top") as Placement,
    card: {
      left,
      top: fitsBelow ? below : rect.top - SPOT_PADDING - GAP - cardHeight,
    },
    arrow: { left: clamp(centerX - left - 7, 20, width - 34) },
  };
}

const arrowClasses: Record<Placement, string> = {
  center: "hidden",
  right: "-left-[7px] border-b border-l",
  bottom: "-top-[7px] border-l border-t",
  top: "-bottom-[7px] border-b border-r",
};

// Tour do primeiro acesso: destaca itens do menu e explica o fluxo app → agentes → leads.
export function OnboardingTour() {
  const { user, completeOnboarding } = useAuth();
  const installation = useAppInstallation();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [cardHeight, setCardHeight] = useState(240);
  const cardRef = useRef<HTMLDivElement>(null);

  const active = Boolean(
    user && !user.onboarding_done && user.terms_accepted && isValidBrazilianWhatsapp(user.phone),
  );
  const step = tourSteps[index];
  const isLast = index === tourSteps.length - 1;
  const installed = installation.data?.installed === true;
  const rect = useTargetRect(active ? step.target : undefined);
  const layout = computeLayout(rect, cardHeight);

  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
  }, [index, active, rect]);

  function finish(destination?: string) {
    void completeOnboarding();
    if (destination) navigate(destination);
  }

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
      if (event.key === "ArrowRight" && !isLast) setIndex((value) => value + 1);
      if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, isLast]);

  if (!active) return null;

  const Icon = step.icon;
  const title = installed && step.installedTitle ? step.installedTitle : step.title;
  const description =
    installed && step.installedDescription ? step.installedDescription : step.description;
  const spotlight: CSSProperties = rect
    ? {
        top: rect.top - SPOT_PADDING,
        left: rect.left - SPOT_PADDING,
        width: rect.width + SPOT_PADDING * 2,
        height: rect.height + SPOT_PADDING * 2,
      }
    : { top: "50%", left: "50%", width: 0, height: 0 };
  const cardStyle: CSSProperties =
    layout.placement === "center"
      ? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
      : layout.card;

  return (
    <>
      {/* Bloqueia cliques no app enquanto o tour está aberto. */}
      <div className="fixed inset-0 z-[60]" aria-hidden="true" />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed z-[60] rounded-2xl transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none",
          rect && "ring-2 ring-primary/80",
        )}
        style={{ ...spotlight, boxShadow: "0 0 0 9999px hsl(224 40% 4% / 0.66)" }}
      >
        {rect && (
          <span className="absolute inset-0 animate-ping rounded-2xl border-2 border-primary/50 [animation-duration:1.8s] motion-reduce:hidden" />
        )}
      </div>
      {!rect && (
        <div className="pointer-events-none fixed inset-0 z-[60] animate-fade-in backdrop-blur-[3px]" />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-description"
        className="fixed z-[61] w-[min(360px,calc(100vw-32px))] rounded-[1.6rem] border border-border/70 bg-popover text-popover-foreground shadow-[0_30px_90px_-24px_rgba(0,0,0,0.6)] transition-[top,left] duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
        style={cardStyle}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute h-3.5 w-3.5 rotate-45 border-border/70 bg-popover",
            arrowClasses[layout.placement],
          )}
          style={layout.arrow}
        />
        <div key={step.id} className="relative animate-fade-in p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl gradient-primary text-primary-foreground shadow-glow">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <button
              type="button"
              onClick={() => finish()}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Pular tour <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-primary">
            Passo {index + 1} de {tourSteps.length}
          </p>
          <h2 id="tour-title" className="mt-1 font-display text-lg font-bold leading-snug">
            {index === 0 && user?.name ? `${title}, ${user.name.split(" ")[0]}!` : title}
          </h2>
          <p id="tour-description" className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>

          {step.highlights && (
            <ol className="mt-4 space-y-2">
              {step.highlights.map((item, position) => (
                <li
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/40 px-3 py-2 text-sm font-medium"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {position + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {tourSteps.map((item, position) => (
                <span
                  key={item.id}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    position === index ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30",
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {index > 0 && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setIndex(index - 1)}
                  aria-label="Passo anterior"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              {isLast ? (
                <Button variant="ghost" size="sm" className="rounded-full" onClick={() => finish()}>
                  Explorar sozinho
                </Button>
              ) : (
                <Button size="sm" className="gap-1.5 rounded-full px-4" onClick={() => setIndex(index + 1)}>
                  {index === 0 ? "Começar" : "Próximo"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          {isLast && (
            <Button
              className="mt-3 h-11 w-full gap-2 rounded-2xl font-semibold shadow-glow"
              onClick={() => finish(installed ? "/agentes" : "/installation")}
            >
              {installed ? "Criar meu primeiro agente" : "Instalar o app agora"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
