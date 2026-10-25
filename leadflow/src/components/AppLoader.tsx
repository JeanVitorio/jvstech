import logo from "@/assets/loading.svg";
import { cn } from "@/lib/utils";

type LoaderVariant = "screen" | "inline" | "compact";

const VARIANT_CLASS: Record<LoaderVariant, string> = {
  screen: "",
  inline: "jvs-loader--inline text-muted-foreground",
  compact: "jvs-loader--inline jvs-loader--compact text-muted-foreground",
};

// Loading com o lobo JVS (estilos no index.html): "screen" cobre a tela,
// "inline" e "compact" ficam no lugar dos dados que ainda estão chegando.
export function AppLoader({
  variant = "screen",
  label = "Carregando",
  className,
}: {
  variant?: LoaderVariant;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("jvs-loader", VARIANT_CLASS[variant], className)}
      role="status"
      aria-live="polite"
    >
      <div className="jvs-loader__stage">
        <div className="jvs-loader__glow" />
        <div className="jvs-loader__ring" />
        <div className="jvs-loader__logo">
          <img src={logo} alt="" width={200} height={200} />
          <span className="jvs-loader__shine" />
        </div>
      </div>
      <div className="jvs-loader__bar">
        <span />
      </div>
      <span className="jvs-loader__label">{label}</span>
    </div>
  );
}
