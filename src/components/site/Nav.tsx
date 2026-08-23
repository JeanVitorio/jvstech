import { useEffect, useState } from "react";
import logo from "@/assets/logo-jvs.png.asset.json";

const links = [
  { href: "#servicos", label: "Serviços" },
  { href: "#metodo", label: "Método" },
  { href: "#resultados", label: "Resultados" },
  { href: "#planos", label: "Planos" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 py-4">
      <nav
        className={`pointer-events-auto flex w-full max-w-5xl items-center justify-between rounded-full border px-3 py-2 transition-all duration-500 ${
          solid
            ? "border-border bg-background/80 shadow-[0_10px_40px_-20px_oklch(0.72_0.16_215_/_60%)] backdrop-blur-xl"
            : "border-transparent bg-transparent"
        }`}
      >
        <a href="#topo" className="flex items-center gap-2 pl-2">
          <img src={logo.url} alt="Logo JVS Tech" className="h-8 w-8 object-contain" />
          <span className="font-display text-sm font-semibold tracking-tight">
            JVS <span className="text-brand">Tech</span>
          </span>
        </a>

        <ul className="hidden items-center gap-7 text-xs text-muted-foreground md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#orcamento"
          className="rounded-full bg-brand px-5 py-2 text-xs font-semibold text-primary-foreground shadow-[var(--glow-ice)] transition-transform hover:scale-[1.04]"
        >
          Pedir orçamento
        </a>
      </nav>
    </div>
  );
}
