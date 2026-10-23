import { CheckCircle2, Download, FileDown, MousePointer2, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

// Moldura de "janela" no estilo macOS/Windows usada nas ilustrações dos passos.
function WindowFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/80 shadow-elegant">
      <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 truncate text-[0.68rem] font-medium text-muted-foreground">{title}</span>
      </div>
      <div className="relative p-4">{children}</div>
    </div>
  );
}

// Balão com setinha apontando para a ação da ilustração.
function Hint({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`absolute z-10 whitespace-nowrap rounded-full bg-primary px-2.5 py-1 text-[0.65rem] font-bold text-primary-foreground shadow-glow after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-[5px] after:border-transparent after:border-t-primary ${className}`}
    >
      {children}
    </span>
  );
}

export function DownloadIllustration() {
  return (
    <WindowFrame title="jvstech.com.br/LeadFlow/installation">
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
          <FileDown className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">LeadFlowSetup.exe</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-3/4 animate-pulse rounded-full gradient-primary" />
          </div>
        </div>
      </div>
      <div className="relative mt-4 flex justify-center">
        <Hint className="-top-7">Clique aqui</Hint>
        <span className="flex items-center gap-1.5 rounded-xl gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow">
          <Download className="h-3.5 w-3.5" /> Baixar aplicativo
        </span>
      </div>
    </WindowFrame>
  );
}

export function SetupIllustration() {
  return (
    <WindowFrame title="Instalar JVS LeadFlow">
      <p className="text-xs font-semibold">Tarefas adicionais</p>
      <div className="mt-2 space-y-1.5 text-[0.7rem] text-muted-foreground">
        <p className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/50" /> Criar
          atalho na Área de Trabalho
        </p>
        <p className="flex items-center gap-2 font-semibold text-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Iniciar o servidor com o Windows
        </p>
      </div>
      <div className="relative mt-4 flex justify-end gap-2">
        <span className="rounded-lg border border-border px-3 py-1.5 text-[0.7rem]">Voltar</span>
        <span className="relative rounded-lg bg-primary px-3 py-1.5 text-[0.7rem] font-semibold text-primary-foreground">
          <Hint className="-top-8 right-0 after:left-3/4">Avançar</Hint>
          Avançar
        </span>
      </div>
    </WindowFrame>
  );
}

export function SmartScreenIllustration() {
  return (
    <div className="overflow-hidden rounded-2xl bg-[#0067b8] p-4 text-white shadow-elegant">
      <ShieldAlert className="h-5 w-5" />
      <p className="mt-2 text-sm font-semibold">O Windows protegeu o computador</p>
      <p className="mt-1 text-[0.68rem] leading-relaxed text-white/80">
        O SmartScreen impediu a inicialização de um aplicativo não reconhecido.
      </p>
      <p className="relative mt-2 inline-block text-[0.7rem] font-semibold underline underline-offset-2">
        <Hint className="-top-7 left-0 after:left-6">1. Clique</Hint>
        Mais informações
      </p>
      <div className="relative mt-4 flex justify-end">
        <span className="relative rounded-md border border-white/70 px-3 py-1.5 text-[0.7rem] font-semibold">
          <Hint className="-top-8 right-0 after:left-3/4">2. Depois aqui</Hint>
          Executar assim mesmo
        </span>
      </div>
    </div>
  );
}

export function LoginIllustration() {
  return (
    <WindowFrame title="JVS LeadFlow">
      <div className="space-y-2">
        <div className="rounded-lg border border-border/70 bg-card px-3 py-2 text-[0.7rem] text-muted-foreground">
          voce@empresa.com
        </div>
        <div className="rounded-lg border border-border/70 bg-card px-3 py-2 text-[0.7rem] tracking-[0.3em] text-muted-foreground">
          ••••••••
        </div>
        <div className="relative">
          <span className="block rounded-lg bg-primary py-2 text-center text-[0.7rem] font-semibold text-primary-foreground">
            Entrar
          </span>
          <MousePointer2 className="absolute -bottom-2 right-8 h-4 w-4 fill-foreground text-background" />
        </div>
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[0.7rem] font-semibold text-success">
        <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> App conectado
      </p>
    </WindowFrame>
  );
}
