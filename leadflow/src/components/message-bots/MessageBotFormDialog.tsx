import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { WeeklyScheduleFields } from "./WeeklyScheduleFields";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";
import {
  META_TEMPLATE_PARAMETERS,
  validateMetaTemplateParameters,
} from "@/lib/metaTemplateParameters";
import { slugify } from "@/services/bots";
import type {
  LeadStageOption,
  MessageBotProvider,
  MessageBotConfig,
  MessageBotFormData,
  MetaTemplateParameter,
  WeeklySchedule,
  WhatsAppSession,
} from "@/types/messageBots";
import type { WhatsAppMetaSession } from "@/types/whatsappMeta";

type Unit = "minutes" | "hours" | "days";
interface UserOption { id: string; name: string; email: string }
interface Props {
  open: boolean;
  current?: MessageBotConfig;
  users: UserOption[];
  sessions: WhatsAppSession[];
  metaSessions: WhatsAppMetaSession[];
  canUseUnofficial: boolean;
  stages: LeadStageOption[];
  niches: string[];
  defaultOwnerId: string;
  saving?: boolean;
  onOwnerChange: (ownerId: string) => void;
  onOpenChange: (open: boolean) => void;
  onSave: (form: MessageBotFormData) => void;
  onDelete?: () => void;
}

const defaultSchedule = (): WeeklySchedule => ({
  mon: { enabled: true, start: "08:00", end: "19:00" },
  tue: { enabled: true, start: "08:00", end: "19:00" },
  wed: { enabled: true, start: "08:00", end: "19:00" },
  thu: { enabled: true, start: "08:00", end: "19:00" },
  fri: { enabled: true, start: "08:00", end: "19:00" },
  sat: { enabled: false, start: "08:00", end: "12:00" },
  sun: { enabled: false, start: "08:00", end: "12:00" },
});

const factors: Record<Unit, number> = {
  minutes: 60,
  hours: 3600,
  days: 86400,
};

function intervalFromSeconds(seconds: number): [number, Unit] {
  if (seconds % 86400 === 0) return [seconds / 86400, "days"];
  if (seconds % 3600 === 0) return [seconds / 3600, "hours"];
  return [Math.max(1, seconds / 60), "minutes"];
}

export function MessageBotFormDialog(props: Props) {
  const { current, defaultOwnerId, onOwnerChange, open } = props;
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [provider, setProvider] = useState<MessageBotProvider>("meta_cloud_api");
  const [sessionId, setSessionId] = useState("new");
  const [sessionName, setSessionName] = useState("");
  const [niche, setNiche] = useState("");
  const [sourceStage, setSourceStage] = useState("");
  const [targetStage, setTargetStage] = useState("");
  const [message, setMessage] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateLanguage, setTemplateLanguage] = useState("pt_BR");
  const [templateParameters, setTemplateParameters] = useState<
    MetaTemplateParameter[]
  >(["nome"]);
  const [minValue, setMinValue] = useState(5);
  const [minUnit, setMinUnit] = useState<Unit>("minutes");
  const [maxValue, setMaxValue] = useState(15);
  const [maxUnit, setMaxUnit] = useState<Unit>("minutes");
  const [maxPerHour, setMaxPerHour] = useState(10);
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [error, setError] = useState("");
  const activeMetaSessions = props.metaSessions.filter(
    (session) => session.credential_status === "active",
  );
  const webSessions = props.sessions.filter(
    (session) => session.provider === "whatsapp_web",
  );

  useEffect(() => {
    if (!open) return;
    const [initialMin, initialMinUnit] = intervalFromSeconds(
      current?.min_interval_seconds ?? 300,
    );
    const [initialMax, initialMaxUnit] = intervalFromSeconds(
      current?.max_interval_seconds ?? 900,
    );
    const initialOwner = current?.lead_owner_id ?? defaultOwnerId;
    const currentSession = props.sessions.find(
      (session) => session.id === current?.whatsapp_session_id,
    );
    const activeMetaSession = props.metaSessions.find(
      (session) =>
        session.session_id === current?.whatsapp_session_id &&
        session.credential_status === "active",
    ) ?? props.metaSessions.find(
      (session) => session.credential_status === "active",
    );
    const initialProvider = currentSession?.provider === "meta_cloud_api"
      ? "meta_cloud_api"
      : props.canUseUnofficial &&
          (currentSession?.provider === "whatsapp_web" || !activeMetaSession)
        ? "whatsapp_web"
        : "meta_cloud_api";
    setName(current?.name ?? "");
    setSlug(current?.slug ?? "");
    setOwnerId(initialOwner);
    onOwnerChange(initialOwner);
    setProvider(initialProvider);
    setSessionId(
      initialProvider === "meta_cloud_api"
        ? (activeMetaSession?.session_id ?? "")
        : (current?.whatsapp_session_id ?? "new"),
    );
    setSessionName("");
    setNiche(current?.niche ?? "");
    setSourceStage(current?.source_stage_id ?? "");
    setTargetStage(current?.target_stage_id ?? "");
    setMessage(current?.message_template ?? "");
    setTemplateName(current?.meta_template_name ?? "");
    setTemplateLanguage(current?.meta_template_language ?? "pt_BR");
    setTemplateParameters(current?.meta_template_parameters?.length
      ? current.meta_template_parameters
      : ["nome"]);
    setMinValue(initialMin);
    setMinUnit(initialMinUnit);
    setMaxValue(initialMax);
    setMaxUnit(initialMaxUnit);
    setMaxPerHour(current?.max_messages_per_hour ?? 10);
    setSchedule(current?.weekly_schedule ?? defaultSchedule());
    setError("");
  }, [
    current,
    defaultOwnerId,
    onOwnerChange,
    open,
    props.canUseUnofficial,
    props.metaSessions,
    props.sessions,
  ]);

  function submit() {
    const minSeconds = Math.round(minValue * factors[minUnit]);
    const maxSeconds = Math.round(maxValue * factors[maxUnit]);
    if (
      !name.trim() || !ownerId || !niche || !sourceStage || !targetStage
    ) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    if (provider === "whatsapp_web" && !props.canUseUnofficial) {
      setError("O WhatsApp Web não está autorizado para este usuário.");
      return;
    }
    if (provider === "whatsapp_web" && !sessionId) {
      setError("Selecione uma sessão do WhatsApp Web.");
      return;
    }
    if (provider === "whatsapp_web" && sessionId === "new" && !sessionName.trim()) {
      setError("Informe o nome da nova sessão do WhatsApp.");
      return;
    }
    if (provider === "whatsapp_web" && !message.trim()) {
      setError("Informe a mensagem inicial.");
      return;
    }
    if (
      provider === "meta_cloud_api" &&
      (!sessionId || !templateName.trim() || !templateLanguage.trim())
    ) {
      setError("A conexão, o template aprovado e o idioma Meta são obrigatórios.");
      return;
    }
    if (!validateMetaTemplateParameters(templateParameters)) {
      setError("Use somente os parâmetros nome, empresa e nicho.");
      return;
    }
    if (sourceStage === targetStage) {
      setError("As etapas de origem e destino devem ser diferentes.");
      return;
    }
    if (minSeconds < 60 || maxSeconds < minSeconds) {
      setError("O intervalo máximo deve ser maior ou igual ao mínimo.");
      return;
    }
    const invalidDay = Object.values(schedule).some(
      (day) => day.enabled && day.start >= day.end,
    );
    if (invalidDay) {
      setError("O horário final deve ser posterior ao inicial.");
      return;
    }
    props.onSave({
      name: name.trim(),
      slug: slug.trim() || slugify(name),
      provider,
      lead_owner_id: ownerId,
      whatsapp_session_id: sessionId,
      new_session_name: provider === "whatsapp_web"
        ? sessionName.trim() || undefined
        : undefined,
      niche,
      source_stage_id: sourceStage,
      target_stage_id: targetStage,
      message_template: provider === "whatsapp_web" ? message.trim() : "",
      meta_template_name: provider === "meta_cloud_api"
        ? templateName.trim()
        : undefined,
      meta_template_language: provider === "meta_cloud_api"
        ? templateLanguage.trim()
        : undefined,
      meta_template_parameters: provider === "meta_cloud_api"
        ? templateParameters
        : [],
      min_interval_seconds: minSeconds,
      max_interval_seconds: maxSeconds,
      max_messages_per_hour: Math.max(1, maxPerHour),
      weekly_schedule: schedule,
    });
  }

  return (
    <Dialog open={open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{current ? "Editar" : "Novo"} bot de WhatsApp</DialogTitle>
        </DialogHeader>
        {!activeMetaSessions.length && !props.canUseUnofficial && (
          <Alert variant="destructive">
            <AlertDescription>
              Nenhuma credencial oficial ativa está disponível. Solicite a configuração
              a um proprietário ou administrador.
            </AlertDescription>
          </Alert>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Provedor de envio">
              <Select
                value={provider}
                onValueChange={(value) => {
                  const next = value as MessageBotProvider;
                  setProvider(next);
                  setSessionId(
                    next === "meta_cloud_api"
                      ? (activeMetaSessions[0]?.session_id ?? "")
                      : "new",
                  );
                  setError("");
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {activeMetaSessions.length > 0 && (
                    <SelectItem value="meta_cloud_api">Meta WhatsApp Cloud API (oficial)</SelectItem>
                  )}
                  {props.canUseUnofficial && (
                    <SelectItem value="whatsapp_web">WhatsApp Web local (não oficial)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {provider === "meta_cloud_api" ? (
            <Alert className="sm:col-span-2 border-success/30 bg-success/5">
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                Conexão oficial selecionada automaticamente:{" "}
                <strong>
                  {activeMetaSessions.find((session) => session.session_id === sessionId)?.session_name
                    ?? "indisponível"}
                </strong>. Não há QR Code; o envio usa templates aprovados pela Meta.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive" className="sm:col-span-2">
              <AlertDescription>
                Integração não oficial via WhatsApp Web, sujeita a bloqueio da conta.
              </AlertDescription>
            </Alert>
          )}
          <Field label="Nome"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Slug"><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Gerado automaticamente" /></Field>
          <Field label="Responsável pelos leads">
            <Select value={ownerId} onValueChange={(value) => { setOwnerId(value); setNiche(""); props.onOwnerChange(value); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{props.users.map((user) => <SelectItem key={user.id} value={user.id}>{user.name} · {user.email}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Nicho">
            <Select value={niche} onValueChange={setNiche}>
              <SelectTrigger><SelectValue placeholder="Selecione o nicho" /></SelectTrigger>
              <SelectContent>{props.niches.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {provider === "whatsapp_web" && (
            <>
              <Field label="Sessão do WhatsApp">
                <Select value={sessionId} onValueChange={setSessionId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Criar nova sessão</SelectItem>
                    {webSessions.map((session) => <SelectItem key={session.id} value={session.id}>{session.name} · {session.status}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              {sessionId === "new" && <Field label="Nome da nova sessão"><Input value={sessionName} onChange={(e) => setSessionName(e.target.value)} /></Field>}
            </>
          )}
          <StageField label="Etapa de origem" value={sourceStage} onChange={setSourceStage} stages={props.stages} />
          <StageField label="Etapa após envio" value={targetStage} onChange={setTargetStage} stages={props.stages} />
          <IntervalField label="Intervalo mínimo" value={minValue} unit={minUnit} onValue={setMinValue} onUnit={setMinUnit} />
          <IntervalField label="Intervalo máximo" value={maxValue} unit={maxUnit} onValue={setMaxValue} onUnit={setMaxUnit} />
          <Field label="Máximo de mensagens por hora"><Input type="number" min={1} max={100} value={maxPerHour} onChange={(e) => setMaxPerHour(Number(e.target.value))} /></Field>
          {provider === "whatsapp_web" ? (
            <div className="sm:col-span-2">
              <Label>Mensagem inicial</Label>
              <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Olá {nome}, tudo bem?" />
              <p className="text-xs text-muted-foreground mt-1">Variáveis opcionais: {"{nome}"}, {"{empresa}"} e {"{nicho}"}.</p>
            </div>
          ) : (
            <>
              <Field label="Nome do template aprovado">
                <Input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="primeiro_contato" />
              </Field>
              <Field label="Idioma do template">
                <Input value={templateLanguage} onChange={(event) => setTemplateLanguage(event.target.value)} placeholder="pt_BR" />
              </Field>
              <div className="sm:col-span-2 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Parâmetros na ordem do template</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setTemplateParameters((currentParameters) => [...currentParameters, "nome"])}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
                  </Button>
                </div>
                {templateParameters.map((parameter, index) => (
                  <div key={`${index}-${parameter}`} className="flex items-center gap-2">
                    <span className="w-7 text-center text-sm text-muted-foreground">{index + 1}</span>
                    <Select value={parameter} onValueChange={(value) => setTemplateParameters((currentParameters) => currentParameters.map((item, itemIndex) => itemIndex === index ? value as MetaTemplateParameter : item))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{META_TEMPLATE_PARAMETERS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button type="button" size="icon" variant="ghost" disabled={index === 0} onClick={() => setTemplateParameters((items) => move(items, index, index - 1))}><ArrowUp className="h-4 w-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" disabled={index === templateParameters.length - 1} onClick={() => setTemplateParameters((items) => move(items, index, index + 1))}><ArrowDown className="h-4 w-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" onClick={() => setTemplateParameters((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Permitidos: nome, empresa e nicho. A posição deve ser igual à definida na Meta.
                </p>
              </div>
            </>
          )}
          <WeeklyScheduleFields value={schedule} onChange={setSchedule} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter className="sm:justify-between">
          <div>{current && props.onDelete && <Button variant="ghost" className="text-destructive" onClick={props.onDelete}><Trash2 className="w-4 h-4 mr-2" />Excluir</Button>}</div>
          <div className="flex gap-2"><Button variant="outline" onClick={() => props.onOpenChange(false)}>Cancelar</Button><Button onClick={submit} disabled={props.saving}>{props.saving ? "Salvando..." : "Salvar"}</Button></div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}</div>;
}

function StageField({ label, value, onChange, stages }: { label: string; value: string; onChange: (value: string) => void; stages: LeadStageOption[] }) {
  return <Field label={label}><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{stages.map((stage) => <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>)}</SelectContent></Select></Field>;
}

function IntervalField({ label, value, unit, onValue, onUnit }: { label: string; value: number; unit: Unit; onValue: (value: number) => void; onUnit: (unit: Unit) => void }) {
  return <Field label={label}><div className="flex gap-2"><Input type="number" min={1} value={value} onChange={(e) => onValue(Number(e.target.value))} /><Select value={unit} onValueChange={(next) => onUnit(next as Unit)}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="minutes">Minutos</SelectItem><SelectItem value="hours">Horas</SelectItem><SelectItem value="days">Dias</SelectItem></SelectContent></Select></div></Field>;
}

function move<T>(items: T[], from: number, to: number): T[] {
  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}
