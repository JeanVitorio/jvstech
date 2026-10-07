import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/store/AppStore";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, Phone, Mail, Building, Target, DollarSign, MessageCircle, MapPin, Globe, Instagram } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { googleMapsLink } from "@/lib/googleMaps";
import { whatsappWebLink } from "@/lib/whatsapp";

interface Lead {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  whatsapp?: string;
  whatsapp_do_not_contact?: boolean;
  first_contact_message?: string;
  google_maps_url?: string;
  source?: string;
  estimated_value?: number;
  stage_id?: string;
  owner_id?: string;
  notes?: string;
  next_followup_at?: string;
  created_at: string;
  updated_at: string;
}

interface LeadStage {
  id: string;
  name: string;
  color: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Operação não concluída.";

const externalHttpUrl = (value?: string) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
};

export default function Leads() {
  const { user } = useAuth();
  const { users } = useApp();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState<Partial<Lead>>({
    name: "",
    company: "",
    email: "",
    phone: "",
    website: "",
    instagram: "",
    whatsapp: "",
    whatsapp_do_not_contact: false,
    source: "",
    estimated_value: 0,
    stage_id: "",
    owner_id: "",
    notes: "",
    next_followup_at: "",
  });

  const isLeader = user?.role === "leader";
  
  useEffect(() => {
    loadLeads();
    loadStages();
  }, [user?.id]);

  async function loadLeads() {
    setLoading(true);
    try {
      const query = supabase.from("leads").select("*");
      
      // Apenas líder inicia com visão geral; demais perfis veem os próprios leads.
      if (!isLeader) {
        query.eq("owner_id", user?.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setLeads(data || []);
    } catch (err: unknown) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadStages() {
    try {
      const { data, error } = await supabase.from("lead_stages").select("*").order("position");
      if (error) throw error;
      setStages(data || []);
      if (data?.length && !form.stage_id) {
        setForm(f => ({ ...f, stage_id: data[0].id }));
      }
    } catch (err: unknown) {
      toast.error(errorMessage(err));
    }
  }

  const filteredLeads = useMemo(() => 
    leads.filter(l => 
      (l.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (l.company?.toLowerCase().includes(search.toLowerCase())) ||
      (l.email?.toLowerCase().includes(search.toLowerCase())) ||
      (l.instagram?.toLowerCase().includes(search.toLowerCase()))
    ),
    [leads, search]
  );

  function openCreate() {
    setEditingId(null);
    setForm({
      name: "",
      company: "",
      email: "",
      phone: "",
      website: "",
      instagram: "",
      whatsapp: "",
      whatsapp_do_not_contact: false,
      source: "",
      estimated_value: 0,
      stage_id: stages[0]?.id || "",
      owner_id: user?.id || "",
      notes: "",
      next_followup_at: "",
    });
    setIsOpen(true);
  }

  function openEdit(lead: Lead) {
    setEditingId(lead.id);
    setForm(lead);
    setIsOpen(true);
  }

  async function save() {
    if (!form.stage_id) return toast.error("Estágio é obrigatório");
    if (!form.owner_id && !editingId) return toast.error("Comercial responsável é obrigatório");
    if (form.website?.trim() && !externalHttpUrl(form.website)) {
      return toast.error("Informe um link válido para o site");
    }
    if (form.instagram?.trim() && !externalHttpUrl(form.instagram)) {
      return toast.error("Informe um link válido para o Instagram");
    }

    try {
      const payload = {
        name: form.name?.trim() || form.company?.trim() || form.email?.trim() || "Lead sem nome",
        company: form.company?.trim() || null,
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        website: form.website?.trim() || null,
        instagram: form.instagram?.trim() || null,
        whatsapp: form.whatsapp?.trim() || null,
        whatsapp_do_not_contact: !!form.whatsapp_do_not_contact,
        source: form.source?.trim() || null,
        estimated_value: form.estimated_value || 0,
        stage_id: form.stage_id,
        owner_id: isLeader ? form.owner_id || null : user?.id || null,
        notes: form.notes?.trim() || null,
        next_followup_at: form.next_followup_at || null,
      };

      if (editingId) {
        const { error } = await supabase.from("leads").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Lead atualizado");
      } else {
        const { error } = await supabase.from("leads").insert([payload]);
        if (error) throw error;
        toast.success("Lead criado");
      }
      
      setIsOpen(false);
      loadLeads();
    } catch (err: unknown) {
      toast.error(errorMessage(err));
    }
  }

  async function deleteLead(id: string) {
    if (!confirm("Tem certeza que deseja excluir este lead?")) return;
    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      toast.success("Lead excluído");
      loadLeads();
    } catch (err: unknown) {
      toast.error(errorMessage(err));
    }
  }

  const getStageColor = (stageId?: string) => {
    const stage = stages.find(s => s.id === stageId);
    return stage?.color || "#FF6500";
  };

  const getStageName = (stageId?: string) => {
    const stage = stages.find(s => s.id === stageId);
    return stage?.name || "—";
  };

  const getOwnerName = (ownerId?: string) => {
    const u = users.find(usr => usr.id === ownerId);
    return u?.name || "Não atribuído";
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <PageHeader title="Leads" subtitle="Gerencie seus leads e oportunidades de vendas." />
        <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Novo Lead</Button>
      </div>

      <Card className="p-4 mb-6">
        <Input
          placeholder="Buscar por nome, empresa ou email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </Card>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Carregando leads…</Card>
      ) : filteredLeads.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          {leads.length === 0 ? "Nenhum lead criado ainda" : "Nenhum lead encontrado"}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map(lead => {
            const owner = users.find(u => u.id === lead.owner_id);
            const can_edit = isLeader || lead.owner_id === user?.id;
            const whatsappLink = whatsappWebLink(
              lead.whatsapp || lead.phone,
              lead.first_contact_message,
            );
            const mapsLink = googleMapsLink(lead.google_maps_url || lead.notes);
            const websiteLink = externalHttpUrl(lead.website);
            const instagramLink = externalHttpUrl(lead.instagram);
            return (
              <Card key={lead.id} className="p-4 hover:bg-muted/50 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{lead.name || lead.company || lead.email || "Lead sem nome"}</h3>
                      <Badge style={{ backgroundColor: getStageColor(lead.stage_id), color: "white" }}>
                        {getStageName(lead.stage_id)}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                      {lead.company && (
                        <div className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5" /> {lead.company}
                        </div>
                      )}
                      {lead.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> {lead.email}
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {lead.phone}
                        </div>
                      )}
                      {websiteLink && (
                        <a
                          href={websiteLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <Globe className="w-3.5 h-3.5" /> Site
                        </a>
                      )}
                      {instagramLink && (
                        <a
                          href={instagramLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <Instagram className="w-3.5 h-3.5" /> Instagram
                        </a>
                      )}
                    </div>

                    <div className="flex gap-4 mt-2 text-sm flex-wrap">
                      {lead.estimated_value && (
                        <div className="flex items-center gap-1 text-success font-semibold">
                          <DollarSign className="w-3.5 h-3.5" /> R$ {lead.estimated_value.toLocaleString("pt-BR")}
                        </div>
                      )}
                      {owner && (
                        <div className="flex items-center gap-1 text-primary">
                          <Target className="w-3.5 h-3.5" /> {owner.name}
                        </div>
                      )}
                      {lead.next_followup_at && (
                        <div className="text-muted-foreground">
                          Follow-up: {formatDate(lead.next_followup_at)}
                        </div>
                      )}
                    </div>

                    {lead.notes && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{lead.notes}</p>
                    )}
                  </div>

                  {can_edit && (
                    <div className="flex gap-2">
                      {whatsappLink && (
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-success hover:text-success"
                        >
                          <a href={whatsappLink} target="_blank" rel="noreferrer">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      {mapsLink && (
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-accent hover:text-accent"
                        >
                          <a href={mapsLink} target="_blank" rel="noreferrer">
                            <MapPin className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(lead)}
                        className="gap-1"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteLead(lead.id)}
                        className="gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Lead" : "Novo Lead"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 pr-1 py-1">
            <div>
              <Label>Nome</Label>
              <Input
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome do lead (opcional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Empresa</Label>
                <Input
                  value={form.company || ""}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Ex: Tech Inc"
                />
              </div>
              <div>
                <Label>Origem</Label>
                <Input
                  value={form.source || ""}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  placeholder="Ex: LinkedIn"
                />
              </div>
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contato@empresa.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone</Label>
                <Input
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(11) 9999-9999"
                />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input
                  value={form.whatsapp || ""}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  placeholder="(11) 9999-9999"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Site</Label>
                <Input
                  type="url"
                  value={form.website || ""}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://empresa.com.br"
                />
              </div>
              <div>
                <Label>Instagram</Label>
                <Input
                  type="url"
                  value={form.instagram || ""}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                  placeholder="https://instagram.com/empresa"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={!!form.whatsapp_do_not_contact}
                onCheckedChange={(value) =>
                  setForm({ ...form, whatsapp_do_not_contact: value })
                }
              />
              <Label>Não contatar este lead pelo WhatsApp</Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estágio *</Label>
                <Select value={form.stage_id || ""} onValueChange={(v) => setForm({ ...form, stage_id: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Comercial *</Label>
                {isLeader ? (
                  <Select value={form.owner_id || ""} onValueChange={(v) => setForm({ ...form, owner_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={user?.name || user?.email || ""} disabled />
                )}
              </div>
            </div>

            <div>
              <Label>Valor estimado</Label>
              <Input
                type="number"
                value={form.estimated_value || 0}
                onChange={(e) => setForm({ ...form, estimated_value: parseFloat(e.target.value) || 0 })}
                placeholder="R$ 0,00"
              />
            </div>

            <div>
              <Label>Próximo follow-up</Label>
              <Input
                type="date"
                value={form.next_followup_at?.split('T')[0] || ""}
                onChange={(e) => setForm({ ...form, next_followup_at: e.target.value ? new Date(e.target.value).toISOString() : "" })}
              />
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                value={form.notes || ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Anotações sobre o lead…"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
