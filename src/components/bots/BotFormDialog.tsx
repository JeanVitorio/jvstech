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
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (form: BotFormData) => void;
  onDelete?: () => void;
}

const lines = (value: string) =>
  [...new Set(value.split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean))];

export function BotFormDialog({
  open,
  current,
  saving,
  onOpenChange,
  onSave,
  onDelete,
}: BotFormDialogProps) {
  const { user } = useAuth();
  const { users } = useApp();
  const isAdmin = user?.role === "leader";
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
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
  const [maxScrolls, setMaxScrolls] = useState(10);
  const [headless, setHeadless] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName(current?.name ?? "");
    setSlug(current?.slug ?? "");
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
    setMaxScrolls(current?.max_scrolls ?? 10);
    setHeadless(current?.headless ?? true);
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
      slug: slug.trim() || slugify(name),
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
      headless,
      max_scrolls: Math.max(1, maxScrolls),
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
          <DialogTitle>{current ? "Editar bot" : "Novo bot"}</DialogTitle>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="Gerado automaticamente"
            />
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
              <Label>Mínimo de avaliações</Label>
              <Switch
                checked={minReviewsEnabled}
                onCheckedChange={setMinReviewsEnabled}
              />
            </div>
            <Input
              type="number"
              min={0}
              value={minReviews}
              disabled={!minReviewsEnabled}
              onChange={(event) => setMinReviews(Number(event.target.value))}
            />
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
                <SelectItem value="with">Somente com telefone</SelectItem>
                <SelectItem value="without">Somente sem telefone</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Máximo de rolagens</Label>
            <Input
              type="number"
              min={1}
              value={maxScrolls}
              onChange={(event) => setMaxScrolls(Number(event.target.value))}
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch checked={headless} onCheckedChange={setHeadless} />
            <Label>Executar navegador em modo headless</Label>
          </div>
          <div className="sm:col-span-2">
            <Label>Cidades — uma por linha</Label>
            <Textarea rows={5} value={cities} onChange={(e) => setCities(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <Label>Palavras incluídas</Label>
              <Switch
                checked={includedEnabled}
                onCheckedChange={setIncludedEnabled}
              />
            </div>
            <Textarea
              rows={4}
              value={included}
              disabled={!includedEnabled}
              onChange={(e) => setIncluded(e.target.value)}
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <Label>Palavras excluídas</Label>
              <Switch
                checked={excludedEnabled}
                onCheckedChange={setExcludedEnabled}
              />
            </div>
            <Textarea
              rows={4}
              value={excluded}
              disabled={!excludedEnabled}
              onChange={(e) => setExcluded(e.target.value)}
            />
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
