import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Monitor,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const appDownloadUrl =
  "https://github.com/JeanVitorio/prospecta-flow-robot/releases/latest/download/ProspectaFlowSetup.exe";
const releaseUrl =
  "https://github.com/JeanVitorio/prospecta-flow-robot/releases/latest";
const releaseApiUrl =
  "https://api.github.com/repos/JeanVitorio/prospecta-flow-robot/releases/latest";

interface NativeUpdateResponse {
  status: "updated" | "installing" | "error";
  version: string;
  message: string;
}

declare global {
  interface Window {
    pywebview?: {
      api?: {
        buscar_e_instalar_atualizacao: () => Promise<NativeUpdateResponse>;
      };
    };
  }
}

const steps = [
  {
    title: "Baixe o instalador",
    description: "Clique no botão de download e aguarde o arquivo ProspectaFlowSetup.exe.",
  },
  {
    title: "Instale no servidor",
    description: "Execute o arquivo e avance pelas etapas mantendo a inicialização com o Windows marcada.",
  },
  {
    title: "Configure e use",
    description: "Ao final, informe a conexão do Supabase na janela local. O servidor será iniciado automaticamente.",
  },
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
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <PageHeader
        title="Instalação"
        subtitle="Baixe e instale o Prospecta Flow no servidor sem configurar Python, Node.js ou bibliotecas."
      />

      <Card className="relative overflow-hidden p-6 sm:p-8 mb-6">
        <div className="absolute inset-0 gradient-glow opacity-50 pointer-events-none" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shadow-glow">
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold">Prospecta Flow para Windows</h2>
                <p className="text-sm text-muted-foreground">Instalador completo para Windows 10 e 11 — 64 bits</p>
                <Badge variant="outline" className="mt-2 border-accent/40 text-accent">
                  Versão atual: {appVersion}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-success" />
                Dependências incluídas
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-success" />
                Atualização automática
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Inicialização com o Windows
              </span>
            </div>
          </div>

          {nativeUpdateAvailable ? (
            <Button
              size="lg"
              className="gap-2 w-full lg:w-auto"
              disabled={updating}
              onClick={updateInstalledApp}
            >
              <RefreshCw className={`w-5 h-5 ${updating ? "animate-spin" : ""}`} />
              {updating ? "Verificando..." : "Buscar atualização agora"}
            </Button>
          ) : (
            <Button asChild size="lg" className="gap-2 w-full lg:w-auto">
              <a href={appDownloadUrl}>
                <Download className="w-5 h-5" />
                Baixar aplicativo
              </a>
            </Button>
          )}
        </div>
        {updateMessage && (
          <p className="relative mt-4 text-sm text-muted-foreground">
            {updateMessage}
          </p>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {steps.map((step, index) => (
          <Card key={step.title} className="p-5">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold mb-4">
              {index + 1}
            </div>
            <h3 className="font-display font-semibold mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-semibold">Já possui uma versão instalada?</h3>
          <p className="text-sm text-muted-foreground mt-1">
            O aplicativo verifica novas versões automaticamente a cada quatro horas.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2 shrink-0">
          <a href={releaseUrl} target="_blank" rel="noreferrer">
            Ver versão {appVersion}
            <ExternalLink className="w-4 h-4" />
          </a>
        </Button>
      </Card>
    </div>
  );
}
