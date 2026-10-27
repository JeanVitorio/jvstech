import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import loading from "@/assets/loading.svg";

// O site (TanStack) e o app (/LeadFlow) são duas aplicações. Sem recarregar
// a página, o roteador do site intercepta o clique, some o conteúdo e fica
// a tela preta. Este link mostra o lobo na hora e vai para o app de verdade.

function mostrarLoader() {
  if (document.getElementById("jvs-nav-loader")) return;
  const el = document.createElement("div");
  el.id = "jvs-nav-loader";
  el.className = "jvs-loader jvs-loader--hold";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.innerHTML = `
    <div class="jvs-loader__stage">
      <div class="jvs-loader__glow"></div>
      <div class="jvs-loader__ring"></div>
      <div class="jvs-loader__logo">
        <img src="${loading}" alt="" width="200" height="200" />
        <span class="jvs-loader__shine"></span>
      </div>
    </div>
    <div class="jvs-loader__bar"><span></span></div>
    <span class="jvs-loader__label">Carregando</span>
  `;
  document.body.appendChild(el);
}

export function irParaLeadFlow(href: string) {
  mostrarLoader();
  window.location.assign(href);
}

export function LeadFlowLink({
  href,
  className,
  children,
  ...rest
}: {
  href: string;
  className?: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className" | "children">) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    irParaLeadFlow(href);
  }

  return (
    <a href={href} className={className} onClick={onClick} {...rest}>
      {children}
    </a>
  );
}
