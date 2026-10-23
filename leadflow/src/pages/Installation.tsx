import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Laptop,
  PackageCheck,
  Power,
  RefreshCw,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppStatusCard } from "@/components/installation/AppStatusCard";
import { InstallSteps } from "@/components/installation/InstallSteps";

const appDownloadUrl =
  "https://github.com/JeanVitorio/prospecta-flow-robot/releases/latest/download/LeadFlowSetup.exe";
const releaseUrl =
  "https://github.com/JeanVitorio/prospecta-flow-robot/releases/latest";
const releaseApiUrl =
  "https://api.github.com/repos/JeanVitorio/prospecta-flow-robot/releases/latest";

const requirements = [
  { icon: Laptop, title: "PC com Windows", text: "Windows 10 ou 11, 64 bits." },
  { icon: Wifi, title: "Internet estável", text: "Os agentes buscam empresas on-line." },
  { icon: Power, title: "App aberto", text: "Os agentes trabalham enquanto o app estiver aberto." },
];

export default function Installation() {
  const [appVersion, setAppVersion] = useState("v1.0.2");
  const [nativeUpdateAvailable, setNativeUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(releaseApiUrl, {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Não foi possível consultar a versão.");
        return response.json() as Promise<{ tag_name?: string }>;
      })
      .then((release) => {
        if (release.tag_name) setAppVersion(release.tag_name);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const detectNativeApi = () => {
      setNativeUpdateAvailable(
        typeof window.pywebview?.api?.buscar_e_instalar_atualizacao ===
          "function",
      );
    };
    detectNativeApi();
    window.addEventListener("pywebviewready", detectNativeApi);
    return () => window.removeEventListener("pywebviewready", detectNativeApi);
  }, []);

  async function updateInstalledApp() {
    const update = window.pywebview?.api?.buscar_e_instalar_atualizacao;
    if (!update) return;
    setUpdating(true);
    setUpdateMessage("Buscando e validando a versão mais recente...");
    try {
      const result = await update();
      setUpdateMessage(result.message);
    } catch {
      setUpdateMessage("Não foi possível buscar ou instalar a atualização.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader
        title="Instalação"
        subtitle="Seus agentes trabalham no app LeadFlow para Windows. Instale uma vez no seu PC e acompanhe tudo por aqui."
      />

      <section className="relative mb-10 overflow-hidden rounded-[2rem] border border-border/70 p-6 shadow-elegant sm:p-10">
        <div className="pointer-events-none absolute inset-0 gradient-glow opacity-60" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_19rem] lg:items-center">
          <div>
            <div className="flex items-center gap-4">
              <span className="grid h-20 w-20 shrink-0 place-items-center rounded-[1.6rem] bg-card shadow-lift ring-1 ring-border/70">
                <Logo size={56} className="rounded-2xl" />
              </span>
              <div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">LeadFlow para Windows</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full border-accent/40 text-accent">
                    Versão {appVersion}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Gratuito · cerca de 210 MB</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-success" /> Tudo incluído, sem configurar nada
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" /> Atualiza sozinho
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Inicia com o Windows
              </span>
            </div>

            <div className="mt-7">
              {nativeUpdateAvailable ? (
                <Button
                  size="lg"
                  className="h-12 w-full gap-2 rounded-2xl px-7 font-semibold shadow-glow sm:w-auto"
                  disabled={updating}
                  onClick={updateInstalledApp}
                >
                  <RefreshCw className={`h-5 w-5 ${updating ? "animate-spin" : ""}`} />
                  {updating ? "Verificando..." : "Buscar atualização agora"}
                </Button>
              ) : (
                <Button
                  asChild
                  size="lg"
                  className="h-12 w-full gap-2 rounded-2xl px-7 font-semibold shadow-glow transition-transform hover:scale-[1.02] sm:w-auto"
                >
                  <a href={appDownloadUrl}>
                    <Download className="h-5 w-5" /> Baixar aplicativo
                  </a>
                </Button>
              )}
              {updateMessage && (
                <p className="mt-3 text-sm text-muted-foreground">{updateMessage}</p>
              )}
            </div>
          </div>

          <AppStatusCard />
        </div>
      </section>

      <div className="mb-6">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-primary">Passo a passo</p>
        <h2 className="mt-1 font-display text-2xl font-bold">Como instalar em 4 passos</h2>
      </div>
      <InstallSteps />

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {requirements.map(({ icon: Icon, title, text }) => (
          <div key={title} className="premium-panel rounded-3xl p-5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-3 font-display font-semibold">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      <div className="premium-panel mt-6 flex flex-col justify-between gap-4 rounded-3xl p-5 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-display font-semibold">Já possui uma versão instalada?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            O aplicativo verifica novas versões automaticamente a cada quatro horas.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0 gap-2 rounded-2xl">
          <a href={releaseUrl} target="_blank" rel="noreferrer">
            Ver versão {appVersion}
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
