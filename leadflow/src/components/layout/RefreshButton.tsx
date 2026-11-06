import { useState } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// No app de computador não existe F5. A maior parte das telas busca os dados
// na abertura, então recarregar a página é o que realmente atualiza todas.
export function RefreshButton() {
  const [recarregando, setRecarregando] = useState(false);

  function recarregar() {
    if (recarregando) return;
    setRecarregando(true);
    window.location.reload();
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={recarregar}
      disabled={recarregando}
      title="Atualizar a tela"
      aria-label="Atualizar a tela"
    >
      <RotateCw className={`w-4 h-4 ${recarregando ? "animate-spin" : ""}`} />
    </Button>
  );
}
