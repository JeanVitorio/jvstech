import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/store/AppStore";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_FIRST_CONTACT_MESSAGE } from "@/lib/whatsapp";
import { slugify } from "@/services/bots";
import type {
  BotConfig,
  BotFormData,
  BotPresenceFilter,
} from "@/types/bots";

interface BotFormDialogProps {
  open: boolean;
  current?: BotConfig;
  // Leads já gerados pelo agente em edição.
  generatedLeads?: number;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (form: BotFormData) => void;
  onDelete?: () => void;
}

const lines = (value: string) =>
  [...new Set(value.split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean))];

// Faixa da barra de limite de leads por agente.
const LEAD_LIMIT_MIN = 10;
const LEAD_LIMIT_MAX = 2000;
const LEAD_LIMIT_STEP = 10;
const LEAD_LIMIT_DEFAULT = 100;

// Valores fixos de execução, não exibidos ao usuário.
const FIXED_MAX_SCROLLS = 30;
const FIXED_HEADLESS = true;

const clampLeadLimit = (value: number) =>
  Math.min(LEAD_LIMIT_MAX, Math.max(LEAD_LIMIT_MIN, Math.round(value) || LEAD_LIMIT_DEFAULT));

export function BotFormDialog({
  open,
  current,
  generatedLeads = 0,
  saving,
  onOpenChange,
  onSave,
  onDelete,
}: BotFormDialogProps) {
  const { user } = useAuth();
  const { users } = useApp();
  const isAdmin = user?.role === "leader";
  const [name, setName] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [niche, setNiche] = useState("");
  const [initialMessage, setInitialMessage] = useState(
    DEFAULT_FIRST_CONTACT_MESSAGE,
  );
  const [cities, setCities] = useState("");
  const [included, setIncluded] = useState("");
  const [excluded, setExcluded] = useState("");
  const [minReviews, setMinReviews] = useState(0);
  const [minReviewsEnabled, setMinReviewsEnabled] = useState(true);
  const [websiteFilter, setWebsiteFilter] =
    useState<BotPresenceFilter>("without");
  const [phoneFilter, setPhoneFilter] =
    useState<BotPresenceFilter>("any");
  const [includedEnabled, setIncludedEnabled] = useState(true);
  const [excludedEnabled, setExcludedEnabled] = useState(true);
  const [ticket, setTicket] = useState(0);
  const [maxLeadsEnabled, setMaxLeadsEnabled] = useState(true);
  const [maxLeads, setMaxLeads] = useState(LEAD_LIMIT_DEFAULT);

  useEffect(() => {
    if (!open) return;
    setName(current?.name ?? "");
    setOwnerId(current?.lead_owner_id ?? user?.id ?? "");
    setSearchTerm(current?.search_term ?? "");
    setNiche(current?.niche ?? "");
    setInitialMessage(
      current?.initial_message ?? DEFAULT_FIRST_CONTACT_MESSAGE,
    );
    setCities((current?.cities ?? []).join("\n"));
    setIncluded((current?.included_words ?? []).join("\n"));
    setExcluded((current?.excluded_words ?? []).join("\n"));
    setMinReviews(current?.min_reviews ?? 0);
    setMinReviewsEnabled(current?.min_reviews_enabled ?? true);
    setWebsiteFilter(current?.website_filter ?? "without");
    setPhoneFilter(current?.phone_filter ?? "any");
    setIncludedEnabled(current?.included_words_enabled ?? true);
    setExcludedEnabled(current?.excluded_words_enabled ?? true);
    setTicket(Number(current?.estimated_ticket ?? 0));
    // Agente novo começa limitado; agente existente sem limite continua sem limite.
    setMaxLeadsEnabled(current ? current.max_leads != null : true);
    setMaxLeads(clampLeadLimit(current?.max_leads ?? LEAD_LIMIT_DEFAULT));
  }, [current, open, user?.id]);

  const selectedOwner = users.find((item) => item.id === ownerId);

  function submit() {
    const cityList = lines(cities);
    if (
      !name.trim() ||
      !searchTerm.trim() ||
      !niche.trim() ||
      !initialMessage.trim() ||
      !cityList.length
    ) {
      return;
    }
    onSave({
      name: name.trim(),
      // O slug identifica as pastas do agente no app; na edição ele é mantido.
      slug: current?.slug || slugify(name),
      lead_owner_id: ownerId,
      owner_email: selectedOwner?.email || user?.email || "",
      search_term: searchTerm.trim(),
      niche: niche.trim(),
      initial_message: initialMessage.trim(),
      cities: cityList,
      min_reviews: Math.max(0, minReviews),
      min_reviews_enabled: minReviewsEnabled,
      estimated_ticket: Math.max(0, ticket),
      website_filter: websiteFilter,
      phone_filter: phoneFilter,
      headless: FIXED_HEADLESS,
      max_scrolls: FIXED_MAX_SCROLLS,
      max_leads: maxLeadsEnabled ? clampLeadLimit(maxLeads) : null,
      excluded_words: lines(excluded),
      excluded_words_enabled: excludedEnabled,
      included_words: lines(included),
      included_words_enabled: includedEnabled,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{current ? "Editar agente" : "Novo agente"}</DialogTitle>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Responsável</Label>
            {isAdmin ? (
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {users.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} · {item.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={user?.email ?? ""} disabled />
            )}
          </div>
          <div>
            <Label>Termo de busca</Label>
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Lojas de veículos"
            />
          </div>
          <div>
            <Label>Nicho</Label>
            <Input value={niche} onChange={(event) => setNiche(event.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Mensagem inicial do WhatsApp</Label>
            <Textarea
              rows={3}
              maxLength={1000}
              value={initialMessage}
              onChange={(event) => setInitialMessage(event.target.value)}
              placeholder={DEFAULT_FIRST_CONTACT_MESSAGE}
            />
          </div>
          <div>
            <Label>Ticket estimado</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={ticket}
              onChange={(event) => setTicket(Number(event.target.value))}
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <Label>Mínimo de avaliações no Google</Label>
              <Switch
                checked={minReviewsEnabled}
                onCheckedChange={setMinReviewsEnabled}
                aria-label="Filtrar pelo mínimo de avaliações no Google"
              />
            </div>
            <Input
              type="number"
              min={0}
              value={minReviews}
              disabled={!minReviewsEnabled}
              onChange={(event) => setMinReviews(Number(event.target.value))}
            />
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Quantidade mínima de avaliações da empresa no Google Maps.
            </p>
          </div>
          <div>
            <Label>Empresas por presença de site</Label>
            <Select
              value={websiteFilter}
              onValueChange={(value: BotPresenceFilter) =>
                setWebsiteFilter(value)
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Com ou sem site</SelectItem>
                <SelectItem value="with">Somente com site</SelectItem>
                <SelectItem value="without">Somente sem site</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Empresas por presença de telefone</Label>
            <Select
              value={phoneFilter}
              onValueChange={(value: BotPresenceFilter) =>
                setPhoneFilter(value)
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Com ou sem telefone</SelectItem>
                <SelectItem value="with">Somente com WhatsApp validado</SelectItem>
                <SelectItem value="without">Somente sem telefone</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {phoneFilter === "without"
                ? "Salva empresas sem telefone, sem validação no WhatsApp."
                : phoneFilter === "with"
                  ? "Só salva empresas cujo número abre conversa no WhatsApp."
                  : "Empresas com telefone só são salvas se o número tiver WhatsApp."}
            </p>
          </div>
          <div className="sm:col-span-2 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="bot-max-leads">Limite de leads do agente</Label>
              <Switch
                checked={maxLeadsEnabled}
                onCheckedChange={setMaxLeadsEnabled}
                aria-label="Limitar a quantidade de leads"
              />
            </div>
            <div className="mt-4 flex items-center gap-4">
              <Slider
                id="bot-max-leads"
                min={LEAD_LIMIT_MIN}
                max={LEAD_LIMIT_MAX}
                step={LEAD_LIMIT_STEP}
                value={[maxLeads]}
                disabled={!maxLeadsEnabled}
                onValueChange={([value]) => setMaxLeads(value)}
                className="flex-1"
              />
              <span className="min-w-[6.5rem] rounded-lg bg-background px-3 py-1.5 text-center text-sm font-semibold tabular-nums shadow-sm">
                {maxLeadsEnabled ? `${maxLeads.toLocaleString("pt-BR")} leads` : "Sem limite"}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {maxLeadsEnabled
                ? "O agente para sozinho ao salvar essa quantidade de leads. Para continuar depois, aumente o limite."
                : "O agente gera leads até concluir as cidades ou atingir o limite mensal do plano."}
              {current && ` Este agente já gerou ${generatedLeads.toLocaleString("pt-BR")} lead(s).`}
            </p>
          </div>
          <div className="sm:col-span-2">
            <Label>Cidades da pesquisa</Label>
            <Textarea
              rows={5}
              value={cities}
              onChange={(e) => setCities(e.target.value)}
              placeholder={"Curitiba - PR\nLondrina - PR\nMaringá - PR"}
            />
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Digite as cidades separando cada uma com Enter, ou cole uma lista com uma cidade por linha.
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <Label>Palavras incluídas na pesquisa</Label>
              <Switch
                checked={includedEnabled}
                onCheckedChange={setIncludedEnabled}
                aria-label="Usar palavras incluídas na pesquisa"
              />
            </div>
            <Textarea
              rows={4}
              value={included}
              disabled={!includedEnabled}
              onChange={(e) => setIncluded(e.target.value)}
              placeholder={"concessionária\nseminovos\nveículos"}
            />
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              A empresa só entra na pesquisa se o nome ou a categoria no Google tiver uma destas
              palavras. Separe cada palavra com Enter, ou cole uma lista com uma palavra por linha.
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <Label>Palavras excluídas da pesquisa</Label>
              <Switch
                checked={excludedEnabled}
                onCheckedChange={setExcludedEnabled}
                aria-label="Usar palavras excluídas da pesquisa"
              />
            </div>
            <Textarea
              rows={4}
              value={excluded}
              disabled={!excludedEnabled}
              onChange={(e) => setExcluded(e.target.value)}
              placeholder={"oficina\nlava-jato\nautopeças"}
            />
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Empresas com qualquer destas palavras no nome ou na categoria do Google ficam de fora.
              Separe cada palavra com Enter, ou cole uma lista com uma palavra por linha.
            </p>
          </div>
        </div>

        <DialogFooter className="sm:justify-between gap-2">
          <div>
            {current && onDelete && (
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={onDelete}
                disabled={saving}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
