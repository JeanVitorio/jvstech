import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { LeadLista } from "./leadsQuery";

interface LeadFormDialogProps {
  aberto: boolean;
  lead: LeadLista | null;
  etapas: { id: string; name: string }[];
  usuarios: { id: string; name: string }[];
  podeAtribuir: boolean;
  usuarioAtual?: { id: string; name?: string; email?: string };
  onFechar: () => void;
  onSalvo: () => void;
}

type Formulario = Partial<LeadLista>;

const FORMULARIO_VAZIO: Formulario = {
  name: "",
  company: "",
  email: "",
  phone: "",
  whatsapp: "",
  city: "",
  niche: "",
  source: "",
  estimated_value: 0,
  notes: "",
  whatsapp_do_not_contact: false,
};

const mensagemErro = (erro: unknown) =>
  erro instanceof Error ? erro.message : "Operação não concluída.";

export function LeadFormDialog({
  aberto,
  lead,
  etapas,
  usuarios,
  podeAtribuir,
  usuarioAtual,
  onFechar,
  onSalvo,
}: LeadFormDialogProps) {
  const [form, setForm] = useState<Formulario>(FORMULARIO_VAZIO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setForm(
      lead ?? {
        ...FORMULARIO_VAZIO,
        stage_id: etapas[0]?.id ?? null,
        owner_id: usuarioAtual?.id ?? null,
      },
    );
  }, [aberto, lead, etapas, usuarioAtual?.id]);

  const ajustar = (parcial: Formulario) => setForm((atual) => ({ ...atual, ...parcial }));

  async function salvar() {
    if (!form.stage_id) {
      toast.error("Escolha a etapa do funil.");
      return;
    }
    setSalvando(true);
    try {
      const dados = {
        name: form.name?.trim() || form.company?.trim() || form.email?.trim() || "Lead sem nome",
        company: form.company?.trim() || null,
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        whatsapp: form.whatsapp?.trim() || null,
        whatsapp_do_not_contact: !!form.whatsapp_do_not_contact,
        city: form.city?.trim() || null,
        niche: form.niche?.trim() || null,
        source: form.source?.trim() || null,
        estimated_value: Number(form.estimated_value) || 0,
        stage_id: form.stage_id,
        owner_id: podeAtribuir ? form.owner_id || null : usuarioAtual?.id || null,
        notes: form.notes?.trim() || null,
        next_followup_at: form.next_followup_at || null,
      };

      if (lead?.id) {
        const { error } = await supabase.from("leads").update(dados).eq("id", lead.id);
        if (error) throw error;
        toast.success("Lead atualizado.");
      } else {
        const { error } = await supabase.from("leads").insert([dados]);
        if (error) throw error;
        toast.success("Lead criado.");
      }
      onSalvo();
      onFechar();
    } catch (erro: unknown) {
      toast.error(mensagemErro(erro));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(estado) => !estado && onFechar()}>
      <DialogContent className="flex max-h-[88vh] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>{lead ? "Editar lead" : "Novo lead"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <Campo rotulo="Nome">
            <Input
              value={form.name ?? ""}
              onChange={(evento) => ajustar({ name: evento.target.value })}
              placeholder="Nome do lead"
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Empresa">
              <Input
                value={form.company ?? ""}
                onChange={(evento) => ajustar({ company: evento.target.value })}
              />
            </Campo>
            <Campo rotulo="Origem">
              <Input
                value={form.source ?? ""}
                onChange={(evento) => ajustar({ source: evento.target.value })}
              />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Cidade">
              <Input
                value={form.city ?? ""}
                onChange={(evento) => ajustar({ city: evento.target.value })}
              />
            </Campo>
            <Campo rotulo="Nicho">
              <Input
                value={form.niche ?? ""}
                onChange={(evento) => ajustar({ niche: evento.target.value })}
              />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Telefone">
              <Input
                value={form.phone ?? ""}
                onChange={(evento) => ajustar({ phone: evento.target.value })}
              />
            </Campo>
            <Campo rotulo="WhatsApp">
              <Input
                value={form.whatsapp ?? ""}
                onChange={(evento) => ajustar({ whatsapp: evento.target.value })}
              />
            </Campo>
          </div>

          <Campo rotulo="E-mail">
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(evento) => ajustar({ email: evento.target.value })}
            />
          </Campo>

          <div className="flex items-center gap-3">
            <Switch
              checked={!!form.whatsapp_do_not_contact}
              onCheckedChange={(valor) => ajustar({ whatsapp_do_not_contact: valor })}
            />
            <Label>Não contatar este lead pelo WhatsApp</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Etapa">
              <Select
                value={form.stage_id ?? ""}
                onValueChange={(valor) => ajustar({ stage_id: valor })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha a etapa" />
                </SelectTrigger>
                <SelectContent>
                  {etapas.map((etapa) => (
                    <SelectItem key={etapa.id} value={etapa.id}>
                      {etapa.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo rotulo="Responsável">
              {podeAtribuir ? (
                <Select
                  value={form.owner_id ?? ""}
                  onValueChange={(valor) => ajustar({ owner_id: valor })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuarios.map((usuario) => (
                      <SelectItem key={usuario.id} value={usuario.id}>
                        {usuario.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={usuarioAtual?.name || usuarioAtual?.email || ""} disabled />
              )}
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Valor estimado">
              <Input
                type="number"
                value={form.estimated_value ?? 0}
                onChange={(evento) =>
                  ajustar({ estimated_value: Number(evento.target.value) || 0 })
                }
              />
            </Campo>
            <Campo rotulo="Próximo follow-up">
              <Input
                type="date"
                value={form.next_followup_at?.slice(0, 10) ?? ""}
                onChange={(evento) =>
                  ajustar({
                    next_followup_at: evento.target.value
                      ? new Date(evento.target.value).toISOString()
                      : null,
                  })
                }
              />
            </Campo>
          </div>

          <Campo rotulo="Notas">
            <Textarea
              rows={3}
              value={form.notes ?? ""}
              onChange={(evento) => ajustar({ notes: evento.target.value })}
            />
          </Campo>
        </div>

        <DialogFooter className="border-t border-border px-5 py-3">
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{rotulo}</Label>
      {children}
    </div>
  );
}
