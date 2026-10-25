import { useEffect, useState } from "react";
import logo from "@/assets/loading.svg";

const TEMPO_MINIMO_MS = 600;
const TEMPO_MAXIMO_MS = 3500;

// Loading inicial: cobre a página até ela carregar (ou no máximo 3,5 s) e some com fade.
export function SitePreloader() {
  const [done, setDone] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const finish = () => {
      window.removeEventListener("load", finish);
      window.clearTimeout(limit);
      const wait = Math.max(0, TEMPO_MINIMO_MS - performance.now());
      timer = window.setTimeout(() => setDone(true), wait);
    };
    const limit = window.setTimeout(finish, TEMPO_MAXIMO_MS);
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish);

    return () => {
      window.removeEventListener("load", finish);
      window.clearTimeout(limit);
      window.clearTimeout(timer);
    };
  }, []);

  if (removed) return null;

  return (
    <div
      className={done ? "jvs-loader is-done" : "jvs-loader"}
      role="status"
      aria-live="polite"
      aria-hidden={done}
      onTransitionEnd={(event) => {
        if (done && event.target === event.currentTarget) setRemoved(true);
      }}
    >
      <div className="jvs-loader__stage">
        <div className="jvs-loader__glow" />
        <div className="jvs-loader__ring" />
        <div className="jvs-loader__logo">
          <img src={logo} alt="" width={200} height={200} fetchPriority="high" />
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
