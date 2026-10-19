import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Cloud,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useWhatsAppMetaActions,
  useWhatsAppMetaConfig,
} from "@/hooks/useWhatsAppMeta";
import {
  WHATSAPP_META_API_VERSION,
  WHATSAPP_META_WEBHOOK_URL,
  type WhatsAppMetaCredentialInput,
} from "@/types/whatsappMeta";

const cloudApiDocs =
  "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started";
const templateDocs =
  "https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/";
const emptySessions = [];

export default function WhatsAppSettings() {
  const config = useWhatsAppMetaConfig();
  const actions = useWhatsAppMetaActions();
  const [sessionId, setSessionId] = useState("new");
  const [sessionName, setSessionName] = useState("WhatsApp oficial");
  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [token, setToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  const sessions = config.data?.sessions ?? emptySessions;
  const selected = useMemo(
    () => sessions.find((session) => session.session_id === sessionId),
    [sessionId, sessions],
  );
  const busy = actions.test.isPending || actions.save.isPending || actions.remove.isPending;

  useEffect(() => {
    if (!sessions.length || sessions.some((item) => item.session_id === sessionId)) return;
    setSessionId(sessions[0].session_id);
  }, [sessionId, sessions]);

  useEffect(() => {
    if (!selected) {
      if (sessionId === "new") {
        setSessionName("WhatsApp oficial");
        setWabaId("");
        setPhoneNumberId("");
      }
      return;
    }
    setSessionName(selected.session_name);
    setWabaId(selected.waba_id ?? "");
    setPhoneNumberId(selected.phone_number_id ?? "");
    // Segredos nunca são carregados novamente pela interface.
    setToken("");
    setAppSecret("");
  }, [selected, sessionId]);

  function input(): WhatsAppMetaCredentialInput | null {
    if (!sessionName.trim() || !/^\d{5,40}$/.test(wabaId.trim())) {
      toast.error("Informe um nome e um WABA ID numérico válido.");
      return null;
    }
    if (!/^\d{5,40}$/.test(phoneNumberId.trim())) {
      toast.error("Informe um Phone Number ID numérico válido.");
      return null;
    }
    if (token.trim().length < 20) {
      toast.error("Informe o token permanente gerado na Meta.");
      return null;
    }
    if (appSecret.trim().length < 16) {
      toast.error("Informe o App Secret do aplicativo Meta.");
      return null;
    }
    return {
      session_id: sessionId === "new" ? undefined : sessionId,
      session_name: sessionName.trim(),
      waba_id: wabaId.trim(),
      phone_number_id: phoneNumberId.trim(),
      token: token.trim(),
      app_secret: appSecret.trim(),
      api_version: WHATSAPP_META_API_VERSION,
    };
  }

  async function testConnection() {
    const payload = input();
    if (!payload) return;
    try {
      const result = await actions.test.mutateAsync(payload);
      toast.success(
        `Credencial válida${result.phone.verified_name ? ` para ${result.phone.verified_name}` : ""}.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao testar a credencial.");
    }
  }

  async function save() {
    const payload = input();
    if (!payload) return;
    try {
      const result = await actions.save.mutateAsync(payload);
      await config.refetch();
      setSessionId(result.session_id);
      setToken("");
      setAppSecret("");
      toast.success("Integração oficial salva e validada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar a configuração.");
    }
  }

  async function remove() {
    if (!selected) return;
    try {
      await actions.remove.mutateAsync(selected.session_id);
      setToken("");
      setAppSecret("");
      setConfirmRemove(false);
      toast.success("Credencial Meta removida.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao remover a configuração.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <PageHeader
        title="WhatsApp Cloud API"
        subtitle="Conecte a API oficial da Meta com credenciais protegidas e envio por templates aprovados."
      />

      <Alert className="mb-6 border-primary/30 bg-primary/[0.05]">
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Templates aprovados são obrigatórios</AlertTitle>
        <AlertDescription>
          A Meta exige um template aprovado para iniciar conversas. Cadastre e aguarde a aprovação
          antes de ativar um bot.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
        <Card className="overflow-hidden">
          <div className="border-b bg-gradient-to-r from-primary/10 via-primary/[0.03] to-transparent p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary p-3 text-primary-foreground shadow-glow">
                  <Cloud className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">Conexão oficial Meta</h2>
                  <p className="text-sm text-muted-foreground">WhatsApp Business Cloud API</p>
                </div>
              </div>
              <StatusBadge configured={selected?.configured} status={selected?.credential_status} />
            </div>
          </div>

          <div className="space-y-5 p-6">
            {config.isLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Consultando integração...
              </p>
            ) : config.isError ? (
              <p className="text-sm text-destructive">
                Não foi possível consultar a configuração oficial.
              </p>
            ) : null}

            {sessions.length > 0 && (
              <Field label="Conexão">
                <Select value={sessionId} onValueChange={setSessionId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sessions.map((session) => (
                      <SelectItem key={session.session_id} value={session.session_id}>
                        {session.session_name}
                      </SelectItem>
                    ))}
                    <SelectItem value="new">Nova conexão oficial</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome da conexão">
                <Input value={sessionName} onChange={(event) => setSessionName(event.target.value)} />
              </Field>
              <Field label="Versão da API">
                <Input value={WHATSAPP_META_API_VERSION} readOnly />
              </Field>
              <Field label="WABA ID">
                <Input inputMode="numeric" value={wabaId} onChange={(event) => setWabaId(event.target.value)} />
              </Field>
              <Field label="Phone Number ID">
                <Input inputMode="numeric" value={phoneNumberId} onChange={(event) => setPhoneNumberId(event.target.value)} />
              </Field>
              <Field label="Token permanente">
                <Input type="password" autoComplete="new-password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Nunca será reexibido" />
              </Field>
              <Field label="App Secret">
                <Input type="password" autoComplete="new-password" value={appSecret} onChange={(event) => setAppSecret(event.target.value)} placeholder={selected?.has_app_secret ? "Cadastrado — informe novamente para salvar" : "Nunca será reexibido"} />
              </Field>
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-5">
              <Button variant="outline" disabled={busy} onClick={testConnection}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Testar
              </Button>
              <Button disabled={busy} onClick={save}>
                <KeyRound className="mr-2 h-4 w-4" /> Salvar configuração
              </Button>
              {selected?.configured && (
                <Button variant="ghost" className="text-destructive hover:text-destructive" disabled={busy} onClick={() => setConfirmRemove(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Remover
                </Button>
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-display text-lg font-bold">Status oficial</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <StatusLine label="Número" value={selected?.display_phone_number} />
              <StatusLine label="Nome verificado" value={selected?.verified_name} />
              <StatusLine label="Qualidade" value={selected?.quality_rating} />
              <StatusLine label="Verificação" value={selected?.code_verification_status} />
              <StatusLine label="Último teste" value={selected?.last_verified_at ? new Date(selected.last_verified_at).toLocaleString("pt-BR") : null} />
            </dl>
          </Card>

          <Card className="p-6">
            <h3 className="font-display text-lg font-bold">Webhook</h3>
            <p className="mt-1 text-sm text-muted-foreground">Use esta URL no painel da Meta.</p>
            <div className="mt-3 flex gap-2">
              <Input value={WHATSAPP_META_WEBHOOK_URL} readOnly />
              <Button size="icon" variant="outline" aria-label="Copiar webhook" onClick={() => void navigator.clipboard.writeText(WHATSAPP_META_WEBHOOK_URL).then(() => toast.success("Webhook copiado."))}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-display text-lg font-bold">Orientações oficiais</h3>
            <div className="mt-4 space-y-2">
              <DocLink href={cloudApiDocs}>Guia inicial da Cloud API</DocLink>
              <DocLink href={templateDocs}>Documentação de templates</DocLink>
            </div>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover a credencial oficial?</AlertDialogTitle>
            <AlertDialogDescription>
              Bots vinculados a esta conexão não poderão iniciar até uma nova credencial ser salva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={remove}>
              Remover credencial
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function StatusBadge({ configured, status }: { configured?: boolean; status?: string | null }) {
  if (configured && status === "active") return <Badge className="bg-success text-success-foreground">Ativa</Badge>;
  return <Badge variant="secondary">{configured ? "Requer atenção" : "Não configurada"}</Badge>;
}

function StatusLine({ label, value }: { label: string; value?: string | null }) {
  return <div className="flex justify-between gap-4 border-b pb-2 last:border-0"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value || "—"}</dd></div>;
}

function DocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Button asChild variant="outline" className="w-full justify-between"><a href={href} target="_blank" rel="noreferrer">{children}<ExternalLink className="h-4 w-4" /></a></Button>;
}
