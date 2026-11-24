import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Trash2 } from "lucide-react";
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

const ETAPAS = [
  { titulo: "Identificação", descricao: "Quem é o agente e o que ele procura" },
  { titulo: "Onde buscar", descricao: "Cidades e quantidade de leads" },
  { titulo: "Filtros", descricao: "O que entra e o que fica de fora" },
] as const;

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
  const [etapa, setEtapa] = useState(0);
  const [erro, setErro] = useState("");
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
    setEtapa(0);
    setErro("");
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
  const cidadesInformadas = lines(cities);
  const ultima = etapa === ETAPAS.length - 1;

  function validar(indice: number): string {
    if (indice === 0) {
      if (!name.trim()) return "Dê um nome ao agente.";
      if (!searchTerm.trim()) return "Informe o termo de busca.";
      if (!niche.trim()) return "Informe o nicho.";
      if (!initialMessage.trim()) return "Escreva a mensagem inicial.";
    }
    if (indice === 1 && !cidadesInformadas.length) {
      return "Informe ao menos uma cidade.";
    }
    return "";
  }

  function irPara(destino: number) {
    // Só valida o que já ficou para trás, para a navegação não travar.
    for (let indice = 0; indice < destino; indice += 1) {
      const problema = validar(indice);
      if (problema) {
        setEtapa(indice);
        setErro(problema);
        return;
      }
    }
    setErro("");
    setEtapa(destino);
  }

  function submit() {
    for (let indice = 0; indice < ETAPAS.length; indice += 1) {
      const problema = validar(indice);
      if (problema) {
        setEtapa(indice);
        setErro(problema);
        return;
      }
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
      cities: cidadesInformadas,
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
      {/* Cabeçalho e rodapé ficam fixos: só os campos rolam, para os botões
          nunca saírem da tela. */}
      <DialogContent className="flex max-h-[92vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{current ? "Editar agente" : "Novo agente"}</DialogTitle>
        </DialogHeader>

        <div className="px-6 pt-4">
          <Passos atual={etapa} onIr={irPara} />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
        {etapa === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              className="sm:col-span-2"
              rotulo="Nome do agente"
              dica="Como ele aparece na sala de prospecção."
            >
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Corretoras de seguros - PR"
              />
            </Campo>

            <Campo
              className="sm:col-span-2"
              rotulo="Responsável pelos leads"
              dica="Quem recebe os leads encontrados por este agente."
            >
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
            </Campo>

            <Campo rotulo="Termo de busca" dica="O que será pesquisado no Google Maps.">
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Corretora de seguros"
              />
            </Campo>

            <Campo rotulo="Nicho" dica="Usado para agrupar os leads na sua base.">
              <Input
                value={niche}
                onChange={(event) => setNiche(event.target.value)}
                placeholder="Corretoras"
              />
            </Campo>

            <Campo rotulo="Ticket estimado" dica="Valor médio de uma venda, em reais.">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={ticket}
                onChange={(event) => setTicket(Number(event.target.value))}
              />
            </Campo>

            <Campo
              className="sm:col-span-2"
              rotulo="Mensagem inicial do WhatsApp"
              dica="Fica pronta no lead para abrir a conversa com um clique."
            >
              <Textarea
                rows={4}
                maxLength={1000}
                value={initialMessage}
                onChange={(event) => setInitialMessage(event.target.value)}
                placeholder={DEFAULT_FIRST_CONTACT_MESSAGE}
              />
            </Campo>
          </div>
        )}

        {etapa === 1 && (
          <div className="space-y-4">
            <Campo
              rotulo="Cidades da pesquisa"
              dica="Uma cidade por linha. Você pode colar uma lista inteira."
            >
              <Textarea
                rows={8}
                value={cities}
                onChange={(e) => setCities(e.target.value)}
                placeholder={"Curitiba - PR\nLondrina - PR\nMaringá - PR"}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {cidadesInformadas.length
                  ? `${cidadesInformadas.length} cidade(s) na fila.`
                  : "Nenhuma cidade informada ainda."}
              </p>
            </Campo>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
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
          </div>
        )}

        {etapa === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Mínimo de avaliações no Google"
              dica="Quantidade mínima de avaliações da empresa no Maps."
              acao={
                <Switch
                  checked={minReviewsEnabled}
                  onCheckedChange={setMinReviewsEnabled}
                  aria-label="Filtrar pelo mínimo de avaliações no Google"
                />
              }
            >
              <Input
                type="number"
                min={0}
                value={minReviews}
                disabled={!minReviewsEnabled}
                onChange={(event) => setMinReviews(Number(event.target.value))}
              />
            </Campo>

            <Campo rotulo="Empresas por presença de site">
              <Select
                value={websiteFilter}
                onValueChange={(value: BotPresenceFilter) => setWebsiteFilter(value)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Com ou sem site</SelectItem>
                  <SelectItem value="with">Somente com site</SelectItem>
                  <SelectItem value="without">Somente sem site</SelectItem>
                </SelectContent>
              </Select>
            </Campo>

            <Campo
              className="sm:col-span-2"
              rotulo="Empresas por presença de telefone"
              dica={
                phoneFilter === "without"
                  ? "Só salva empresas que não informam telefone no Google."
                  : phoneFilter === "with"
                    ? "Só salva empresas que informam telefone no Google."
                    : "Salva todas as empresas encontradas, com ou sem telefone."
              }
            >
              <Select
                value={phoneFilter}
                onValueChange={(value: BotPresenceFilter) => setPhoneFilter(value)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Com ou sem telefone</SelectItem>
                  <SelectItem value="with">Somente com telefone</SelectItem>
                  <SelectItem value="without">Somente sem telefone</SelectItem>
                </SelectContent>
              </Select>
            </Campo>

            <Campo
              rotulo="Palavras incluídas na pesquisa"
              dica="A empresa só entra se o nome ou a categoria tiver uma destas palavras. Uma por linha."
              acao={
                <Switch
                  checked={includedEnabled}
                  onCheckedChange={setIncludedEnabled}
                  aria-label="Usar palavras incluídas na pesquisa"
                />
              }
            >
              <Textarea
                rows={6}
                value={included}
                disabled={!includedEnabled}
                onChange={(e) => setIncluded(e.target.value)}
                placeholder={"corretor\nseguro\ncorretagem"}
              />
            </Campo>

            <Campo
              rotulo="Palavras excluídas da pesquisa"
              dica="Empresas com qualquer destas palavras ficam de fora. Uma por linha."
              acao={
                <Switch
                  checked={excludedEnabled}
                  onCheckedChange={setExcludedEnabled}
                  aria-label="Usar palavras excluídas da pesquisa"
                />
              }
            >
              <Textarea
                rows={6}
                value={excluded}
                disabled={!excludedEnabled}
                onChange={(e) => setExcluded(e.target.value)}
                placeholder={"banco\ndespachante\nautoescola"}
              />
            </Campo>
          </div>
        )}

        </div>

        {erro && (
          <p className="border-t border-border px-6 pt-3 text-sm text-destructive">{erro}</p>
        )}

        <DialogFooter className="gap-2 border-t border-border bg-background/60 px-6 py-4 sm:justify-between">
          <div>
            {current && onDelete && (
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={onDelete}
                disabled={saving}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {etapa > 0 ? (
              <Button variant="outline" onClick={() => irPara(etapa - 1)}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
              </Button>
            ) : (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            )}
            {ultima ? (
              <Button onClick={submit} disabled={saving}>
                <Check className="mr-1.5 h-4 w-4" />
                {saving ? "Salvando..." : current ? "Salvar alterações" : "Criar agente"}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  const problema = validar(etapa);
                  if (problema) {
                    setErro(problema);
                    return;
                  }
                  irPara(etapa + 1);
                }}
              >
                Próximo <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Passos({ atual, onIr }: { atual: number; onIr: (indice: number) => void }) {
  return (
    <div className="flex gap-2 border-b border-border pb-4">
      {ETAPAS.map((etapa, indice) => {
        const feita = indice < atual;
        const ativa = indice === atual;
        return (
          <button
            key={etapa.titulo}
            type="button"
            onClick={() => onIr(indice)}
            className={`flex flex-1 items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition ${
              ativa
                ? "border-primary/60 bg-primary/10"
                : "border-border hover:border-primary/40"
            }`}
          >
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                ativa
                  ? "gradient-primary text-primary-foreground"
                  : feita
                    ? "bg-success/20 text-success"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {feita ? <Check className="h-3.5 w-3.5" /> : indice + 1}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold">{etapa.titulo}</span>
              <span className="hidden truncate text-[10px] text-muted-foreground sm:block">
                {etapa.descricao}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Campo({
  rotulo,
  dica,
  acao,
  className,
  children,
}: {
  rotulo: string;
  dica?: string;
  acao?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <Label>{rotulo}</Label>
        {acao}
      </div>
      <div className="mt-1.5">{children}</div>
      {dica && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{dica}</p>}
    </div>
  );
}
