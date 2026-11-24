import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, MessageCircle, Snowflake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { whatsappWebLink } from "@/lib/whatsapp";
import { diasParado } from "./funnelData";
import type { AgendaDoDia, LeadPainel } from "./dashboardData";

type Aba = "atrasados" | "hoje" | "esfriando";

const ABAS: { id: Aba; rotulo: string; icone: typeof AlertTriangle; cor: string }[] = [
  { id: "atrasados", rotulo: "Atrasados", icone: AlertTriangle, cor: "text-destructive" },
  { id: "hoje", rotulo: "Para hoje", icone: CalendarClock, cor: "text-warning" },
  { id: "esfriando", rotulo: "Esfriando", icone: Snowflake, cor: "text-accent" },
];

// O que precisa de ação agora, com o WhatsApp a um clique.
export function DashboardToday({ agenda }: { agenda: AgendaDoDia }) {
  const inicial: Aba = agenda.atrasados.length
    ? "atrasados"
    : agenda.hoje.length
      ? "hoje"
      : "esfriando";
  const [aba, setAba] = useState<Aba>(inicial);
  const lista = agenda[aba].slice(0, 8);

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Meu dia</h3>
        <Link to="/sales">
          <Button size="sm" variant="ghost">
            Ver funil
          </Button>
        </Link>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {ABAS.map((item) => {
          const Icone = item.icone;
          const quantidade = agenda[item.id].length;
          return (
            <Button
              key={item.id}
              size="sm"
              variant={aba === item.id ? "default" : "ghost"}
              className="h-8 gap-1.5 text-xs"
              onClick={() => setAba(item.id)}
            >
              <Icone className={`h-3.5 w-3.5 ${aba === item.id ? "" : item.cor}`} />
              {item.rotulo}
              <Badge variant="outline" className="ml-0.5 px-1 text-[10px]">
                {quantidade}
              </Badge>
            </Button>
          );
        })}
      </div>

      <div className="space-y-2">
        {lista.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {aba === "atrasados"
              ? "Nenhum follow-up atrasado. Parabéns."
              : aba === "hoje"
                ? "Nada marcado para hoje."
                : "Nenhuma negociação esquecida."}
          </p>
        )}
        {lista.map((lead) => (
          <Linha key={lead.id} lead={lead} aba={aba} />
        ))}
        {agenda[aba].length > lista.length && (
          <p className="pt-1 text-xs text-muted-foreground">
            e mais {agenda[aba].length - lista.length} lead(s)…
          </p>
        )}
      </div>
    </Card>
  );
}

function Linha({ lead, aba }: { lead: LeadPainel; aba: Aba }) {
  const whats = whatsappWebLink(
    lead.whatsapp || lead.phone,
    lead.first_contact_message ?? undefined,
  );
  const legenda =
    aba === "esfriando"
      ? `${diasParado(lead)} dia(s) sem contato`
      : lead.next_followup_at
        ? new Date(lead.next_followup_at).toLocaleString("pt-BR")
        : "";

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{lead.name}</p>
        <p
          className={`text-xs ${aba === "atrasados" ? "text-destructive" : "text-muted-foreground"}`}
        >
          {legenda}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {lead.estimated_value ? (
          <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
            R$ {Number(lead.estimated_value).toLocaleString("pt-BR")}
          </span>
        ) : null}
        {whats && (
          <a
            href={whats}
            target="_blank"
            rel="noreferrer"
            className="rounded p-2 text-success hover:bg-success/15"
            title="Abrir conversa no WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
