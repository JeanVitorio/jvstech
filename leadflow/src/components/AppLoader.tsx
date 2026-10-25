import logo from "@/assets/loading.svg";

// Mesmo loading do index.html (estilos ficam lá), usado enquanto a sessão carrega.
export function AppLoader() {
  return (
    <div className="jvs-loader" role="status" aria-live="polite">
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
      <span className="jvs-loader__label">Carregando</span>
    </div>
  );
}
