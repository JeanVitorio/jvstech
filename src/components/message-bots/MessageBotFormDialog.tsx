import { useEffect, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
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
import { slugify } from "@/services/bots";
import type {
  LeadStageOption,
  MessageBotConfig,
  MessageBotFormData,
  WeeklySchedule,
  WhatsAppSession,
} from "@/types/messageBots";

type Unit = "minutes" | "hours" | "days";
interface UserOption { id: string; name: string; email: string }
interface Props {
  open: boolean;
  current?: MessageBotConfig;
  users: UserOption[];
  sessions: WhatsAppSession[];
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
  const [sessionId, setSessionId] = useState("new");
  const [sessionName, setSessionName] = useState("");
  const [niche, setNiche] = useState("");
  const [sourceStage, setSourceStage] = useState("");
  const [targetStage, setTargetStage] = useState("");
  const [message, setMessage] = useState("");
  const [minValue, setMinValue] = useState(5);
  const [minUnit, setMinUnit] = useState<Unit>("minutes");
  const [maxValue, setMaxValue] = useState(15);
  const [maxUnit, setMaxUnit] = useState<Unit>("minutes");
  const [maxPerHour, setMaxPerHour] = useState(10);
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const [initialMin, initialMinUnit] = intervalFromSeconds(
      current?.min_interval_seconds ?? 300,
    );
    const [initialMax, initialMaxUnit] = intervalFromSeconds(
      current?.max_interval_seconds ?? 900,
    );
    const initialOwner = current?.lead_owner_id ?? defaultOwnerId;
    setName(current?.name ?? "");
    setSlug(current?.slug ?? "");
    setOwnerId(initialOwner);
    onOwnerChange(initialOwner);
    setSessionId(current?.whatsapp_session_id ?? "new");
    setSessionName("");
    setNiche(current?.niche ?? "");
    setSourceStage(current?.source_stage_id ?? "");
    setTargetStage(current?.target_stage_id ?? "");
    setMessage(current?.message_template ?? "");
    setMinValue(initialMin);
    setMinUnit(initialMinUnit);
    setMaxValue(initialMax);
    setMaxUnit(initialMaxUnit);
    setMaxPerHour(current?.max_messages_per_hour ?? 10);
    setSchedule(current?.weekly_schedule ?? defaultSchedule());
    setError("");
  }, [current, defaultOwnerId, onOwnerChange, open]);

  function submit() {
    const minSeconds = Math.round(minValue * factors[minUnit]);
    const maxSeconds = Math.round(maxValue * factors[maxUnit]);
    if (
      !name.trim() || !ownerId || !sessionId || !niche ||
      !sourceStage || !targetStage || !message.trim()
    ) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    if (sessionId === "new" && !sessionName.trim()) {
      setError("Informe o nome da nova sessão do WhatsApp.");
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
      lead_owner_id: ownerId,
      whatsapp_session_id: sessionId,
      new_session_name: sessionName.trim() || undefined,
      niche,
      source_stage_id: sourceStage,
      target_stage_id: targetStage,
      message_template: message.trim(),
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
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Integração não oficial via WhatsApp Web, sujeita a bloqueio da conta.
          </AlertDescription>
        </Alert>
        <div className="grid sm:grid-cols-2 gap-4">
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
          <Field label="Sessão do WhatsApp">
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Criar nova sessão</SelectItem>
                {props.sessions.map((session) => <SelectItem key={session.id} value={session.id}>{session.name} · {session.status}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {sessionId === "new" && <Field label="Nome da nova sessão"><Input value={sessionName} onChange={(e) => setSessionName(e.target.value)} /></Field>}
          <StageField label="Etapa de origem" value={sourceStage} onChange={setSourceStage} stages={props.stages} />
          <StageField label="Etapa após envio" value={targetStage} onChange={setTargetStage} stages={props.stages} />
          <IntervalField label="Intervalo mínimo" value={minValue} unit={minUnit} onValue={setMinValue} onUnit={setMinUnit} />
          <IntervalField label="Intervalo máximo" value={maxValue} unit={maxUnit} onValue={setMaxValue} onUnit={setMaxUnit} />
          <Field label="Máximo de mensagens por hora"><Input type="number" min={1} max={100} value={maxPerHour} onChange={(e) => setMaxPerHour(Number(e.target.value))} /></Field>
          <div className="sm:col-span-2">
            <Label>Mensagem inicial</Label>
            <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Olá {nome}, tudo bem?" />
            <p className="text-xs text-muted-foreground mt-1">Variáveis opcionais: {"{nome}"}, {"{empresa}"} e {"{nicho}"}.</p>
          </div>
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
