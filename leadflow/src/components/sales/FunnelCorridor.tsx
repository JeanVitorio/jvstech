import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Flame, Snowflake, Trophy, XCircle } from "lucide-react";
import {
  COR_TEMPERATURA,
  diasParado,
  temperaturaDoLead,
  type LeadResumo,
} from "./funnelData";
import "@/components/bots/office/office.css";

interface Etapa {
  id: string;
  name: string;
  color: string;
  is_won: boolean;
  is_lost: boolean;
}

interface FunnelCorridorProps {
  etapas: Etapa[];
  leads: LeadResumo[];
  onAbrirLead: (leadId: string) => void;
}

const reais = (valor: number) =>
  `R$ ${Math.round(valor).toLocaleString("pt-BR")}`;

// Mesmo arrastar do quadro: cada estação é um destino e cada pasta é um lead.
export function FunnelCorridor({ etapas, leads, onAbrirLead }: FunnelCorridorProps) {
  // Fica dentro do salão, então não desenha a sala de novo.
  return (
    <div className="relative flex flex-1 gap-4 overflow-x-auto pb-2">
      {etapas.map((etapa, indice) => (
        <Estacao
          key={etapa.id}
          etapa={etapa}
          ordem={indice + 1}
          leads={leads.filter((lead) => lead.stage_id === etapa.id)}
          onAbrirLead={onAbrirLead}
        />
      ))}
    </div>
  );
}

function Estacao({
  etapa,
  ordem,
  leads,
  onAbrirLead,
}: {
  etapa: Etapa;
  ordem: number;
  leads: LeadResumo[];
  onAbrirLead: (leadId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage:${etapa.id}` });
  const total = leads.reduce((soma, lead) => soma + Number(lead.estimated_value || 0), 0);
  const Icone = etapa.is_won ? Trophy : etapa.is_lost ? XCircle : null;

  return (
    <div
      ref={setNodeRef}
      className={`flex max-h-[780px] w-[250px] shrink-0 flex-col rounded-2xl border p-3 transition ${
        isOver
          ? "border-primary bg-primary/10"
          : "border-white/10 bg-black/40"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-black"
          style={{ background: etapa.color || "#ff6500" }}
        >
          {Icone ? <Icone className="h-3.5 w-3.5" /> : ordem}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white">{etapa.name}</p>
          <p className="text-[10px] text-white/45">
            {leads.length} lead(s) · {reais(total)}
          </p>
        </div>
      </div>

      {/* balcão da estação */}
      <div className="mt-2 h-2 rounded-full bg-gradient-to-r from-white/20 via-white/10 to-transparent" />

      <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-0.5">
        {leads.map((lead) => (
          <Pasta key={lead.id} lead={lead} onAbrir={() => onAbrirLead(lead.id)} />
        ))}
        {!leads.length && (
          <p className="pt-10 text-center text-[11px] text-white/30">
            Nenhum lead nesta estação.
          </p>
        )}
      </div>
    </div>
  );
}

function Pasta({ lead, onAbrir }: { lead: LeadResumo; onAbrir: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });
  const estilo = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const temperatura = temperaturaDoLead(lead);
  const cor = COR_TEMPERATURA[temperatura];
  const dias = diasParado(lead);

  return (
    <div
      ref={setNodeRef}
      style={estilo}
      className={`rounded-lg border border-white/10 bg-[#15161b] transition ${
        isDragging ? "opacity-40" : "hover:border-primary/40"
      }`}
    >
      {/* aba da pasta, com a cor da temperatura */}
      <div className="h-1.5 rounded-t-lg" style={{ background: cor }} />
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab px-2.5 py-2 active:cursor-grabbing"
      >
        <button
          onClick={onAbrir}
          className="block w-full truncate text-left text-[11.5px] font-medium text-white hover:text-primary"
        >
          {lead.name}
        </button>
        <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
          <span className="flex items-center gap-1" style={{ color: cor }}>
            {temperatura === "frio" || temperatura === "esfriando" ? (
              <Snowflake className="h-3 w-3" />
            ) : (
              <Flame className="h-3 w-3" />
            )}
            {dias === 0 ? "hoje" : `${dias}d parado`}
          </span>
          {lead.estimated_value ? (
            <span className="tabular-nums text-white/60">
              {reais(Number(lead.estimated_value))}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
