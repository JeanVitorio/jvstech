import { BellOff, Trash2, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LeadsBulkActionsProps {
  quantidade: number;
  usuarios: { id: string; name: string }[];
  etapas: { id: string; name: string }[];
  podeAtribuir: boolean;
  aplicando: boolean;
  onAtribuir: (ownerId: string) => void;
  onMover: (stageId: string) => void;
  onNaoContatar: (valor: boolean) => void;
  onExcluir: () => void;
  onLimpar: () => void;
}

// Barra que aparece ao marcar leads: tudo aqui age sobre a seleção inteira.
export function LeadsBulkActions({
  quantidade,
  usuarios,
  etapas,
  podeAtribuir,
  aplicando,
  onAtribuir,
  onMover,
  onNaoContatar,
  onExcluir,
  onLimpar,
}: LeadsBulkActionsProps) {
  if (!quantidade) return null;

  return (
    <div className="sticky bottom-3 z-30 flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-card/95 p-3 shadow-lg backdrop-blur">
      <span className="text-sm font-semibold">
        {quantidade.toLocaleString("pt-BR")} selecionado(s)
      </span>

      {podeAtribuir && (
        <Select onValueChange={onAtribuir} disabled={aplicando}>
          <SelectTrigger className="h-9 w-[190px]">
            <UserCheck className="mr-1 h-4 w-4 shrink-0" />
            <SelectValue placeholder="Atribuir responsável" />
          </SelectTrigger>
          <SelectContent>
            {usuarios.map((usuario) => (
              <SelectItem key={usuario.id} value={usuario.id}>
                {usuario.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select onValueChange={onMover} disabled={aplicando}>
        <SelectTrigger className="h-9 w-[170px]">
          <SelectValue placeholder="Mover para etapa" />
        </SelectTrigger>
        <SelectContent>
          {etapas.map((etapa) => (
            <SelectItem key={etapa.id} value={etapa.id}>
              {etapa.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={aplicando}
        onClick={() => onNaoContatar(true)}
      >
        <BellOff className="h-4 w-4" /> Não contatar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={aplicando}
        onClick={() => onNaoContatar(false)}
      >
        Liberar contato
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-destructive"
        disabled={aplicando}
        onClick={onExcluir}
      >
        <Trash2 className="h-4 w-4" /> Excluir
      </Button>

      <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={onLimpar}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
