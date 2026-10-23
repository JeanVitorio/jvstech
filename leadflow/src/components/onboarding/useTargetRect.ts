import { useEffect, useState } from "react";

// Retorna a posição do primeiro elemento visível com data-tour={target}.
// Nulo quando não há alvo ou ele está oculto (ex.: menu lateral no celular).
export function useTargetRect(target?: string): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!target) {
      setRect(null);
      return;
    }

    const find = () =>
      Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)).find(
        (element) => {
          const box = element.getBoundingClientRect();
          return box.width > 0 && box.height > 0;
        },
      );

    find()?.scrollIntoView({ block: "nearest", behavior: "smooth" });

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = find()?.getBoundingClientRect() ?? null;
        setRect((current) =>
          current &&
          box &&
          current.top === box.top &&
          current.left === box.left &&
          current.width === box.width &&
          current.height === box.height
            ? current
            : box,
        );
      });
    };

    update();
    // Acompanha animações de layout logo após a troca de passo.
    const settle = window.setInterval(update, 250);
    const stopSettle = window.setTimeout(() => window.clearInterval(settle), 1500);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(settle);
      window.clearTimeout(stopSettle);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [target]);

  return rect;
}
