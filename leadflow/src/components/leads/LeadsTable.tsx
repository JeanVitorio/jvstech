import { Edit2, Instagram, MapPin, MessageCircle, Phone, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { googleMapsLink } from "@/lib/googleMaps";
import { whatsappWebLink } from "@/lib/whatsapp";
import type { LeadLista } from "./leadsQuery";

interface LeadsTableProps {
  leads: LeadLista[];
  selecionados: Set<string>;
  onAlternar: (id: string) => void;
  onAlternarPagina: (marcar: boolean) => void;
  etapa: (id?: string | null) => { nome: string; cor: string };
  responsavel: (id?: string | null) => string;
  podeEditar: (lead: LeadLista) => boolean;
  onEditar: (lead: LeadLista) => void;
  onExcluir: (lead: LeadLista) => void;
}

const reais = (valor?: number | null) =>
  valor ? `R$ ${Number(valor).toLocaleString("pt-BR")}` : "—";

const instagramHttp = (valor?: string | null) => {
  if (!valor) return null;
  try {
    const url = new URL(valor);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
};

export function LeadsTable({
  leads,
  selecionados,
  onAlternar,
  onAlternarPagina,
  etapa,
  responsavel,
  podeEditar,
  onEditar,
  onExcluir,
}: LeadsTableProps) {
  const todosMarcados = leads.length > 0 && leads.every((lead) => selecionados.has(lead.id));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={todosMarcados}
              onCheckedChange={(valor) => onAlternarPagina(valor === true)}
              aria-label="Selecionar a página"
            />
          </TableHead>
          <TableHead>Lead</TableHead>
          <TableHead className="hidden lg:table-cell">Cidade / Nicho</TableHead>
          <TableHead>Etapa</TableHead>
          <TableHead className="hidden md:table-cell">Responsável</TableHead>
          <TableHead className="hidden sm:table-cell text-right">Valor</TableHead>
          <TableHead className="w-[140px] text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => {
          const dados = etapa(lead.stage_id);
          const whats = whatsappWebLink(
            lead.whatsapp || lead.phone,
            lead.first_contact_message ?? undefined,
          );
          const maps = googleMapsLink(lead.google_maps_url || lead.notes);
          const insta = instagramHttp(lead.instagram ?? null);
          const editavel = podeEditar(lead);

          return (
            <TableRow key={lead.id} className={selecionados.has(lead.id) ? "bg-primary/5" : ""}>
              <TableCell>
                <Checkbox
                  checked={selecionados.has(lead.id)}
                  onCheckedChange={() => onAlternar(lead.id)}
                  aria-label={`Selecionar ${lead.name}`}
                />
              </TableCell>

              <TableCell className="max-w-[280px]">
                <button
                  onClick={() => editavel && onEditar(lead)}
                  className="block max-w-full truncate text-left font-medium hover:text-primary"
                >
                  {lead.name}
                </button>
                <p className="truncate text-xs text-muted-foreground">
                  {[
                    // A empresa só aparece quando difere do nome do lead.
                    (lead.company ?? "").trim().toLowerCase() ===
                    (lead.name ?? "").trim().toLowerCase()
                      ? null
                      : lead.company,
                    lead.whatsapp || lead.phone || "sem telefone",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {lead.whatsapp_do_not_contact && (
                  <Badge variant="outline" className="mt-1 text-[10px] text-destructive">
                    não contatar
                  </Badge>
                )}
              </TableCell>

              <TableCell className="hidden max-w-[200px] lg:table-cell">
                <p className="truncate text-sm">{lead.city || "—"}</p>
                <p className="truncate text-xs text-muted-foreground">{lead.niche || ""}</p>
              </TableCell>

              <TableCell>
                {lead.stage_id ? (
                  <Badge style={{ backgroundColor: dados.cor, color: "#111" }}>{dados.nome}</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    fora do funil
                  </Badge>
                )}
              </TableCell>

              <TableCell className="hidden max-w-[160px] truncate text-sm md:table-cell">
                {responsavel(lead.owner_id)}
              </TableCell>

              <TableCell className="hidden text-right tabular-nums sm:table-cell">
                {reais(lead.estimated_value)}
              </TableCell>

              <TableCell>
                <div className="flex items-center justify-end gap-0.5">
                  {whats && (
                    <a
                      href={whats}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded p-1.5 text-success hover:bg-success/15"
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  )}
                  {maps && (
                    <a
                      href={maps}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded p-1.5 text-accent hover:bg-accent/15"
                      title="Google Maps"
                    >
                      <MapPin className="h-4 w-4" />
                    </a>
                  )}
                  {insta && (
                    <a
                      href={insta}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded p-1.5 text-primary hover:bg-primary/15"
                      title="Instagram"
                    >
                      <Instagram className="h-4 w-4" />
                    </a>
                  )}
                  {!whats && !maps && !insta && (
                    <Phone className="h-4 w-4 text-muted-foreground/40" />
                  )}
                  {editavel && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => onEditar(lead)}
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => onExcluir(lead)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
