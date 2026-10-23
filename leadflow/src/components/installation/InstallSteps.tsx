import type { ComponentType } from "react";
import {
  DownloadIllustration,
  LoginIllustration,
  SetupIllustration,
  SmartScreenIllustration,
} from "./StepIllustrations";

const steps: { title: string; description: string; tip?: string; Illustration: ComponentType }[] = [
  {
    title: "Baixe o instalador",
    description:
      "Clique em \"Baixar aplicativo\". O arquivo LeadFlowSetup.exe vai para a pasta Downloads do seu PC.",
    Illustration: DownloadIllustration,
  },
  {
    title: "Abra o arquivo e avance",
    description:
      "Dê dois cliques no LeadFlowSetup.exe e vá clicando em \"Avançar\". Deixe marcada a opção \"Iniciar o servidor com o Windows\".",
    tip: "Assim os agentes voltam a trabalhar sozinhos sempre que o PC ligar.",
    Illustration: SetupIllustration,
  },
  {
    title: "Se o Windows avisar, permita",
    description:
      "Pode aparecer uma tela azul do Windows SmartScreen. Clique em \"Mais informações\" e depois em \"Executar assim mesmo\".",
    tip: "É um aviso comum para programas novos. O instalador é oficial da JVS Tech.",
    Illustration: SmartScreenIllustration,
  },
  {
    title: "Entre com a mesma conta",
    description:
      "Ao final, o LeadFlow abre sozinho. Entre com o mesmo e-mail e senha que você usa aqui na Web.",
    tip: "Pronto: o status no topo desta página fica verde e a criação de agentes é liberada.",
    Illustration: LoginIllustration,
  },
];

// Passo a passo visual da instalação, em linha do tempo.
export function InstallSteps() {
  return (
    <ol className="relative space-y-5 before:absolute before:bottom-6 before:left-[1.15rem] before:top-6 before:w-px before:bg-gradient-to-b before:from-primary/60 before:via-border before:to-transparent sm:before:left-[1.4rem]">
      {steps.map(({ title, description, tip, Illustration }, index) => (
        <li key={title} className="relative grid gap-4 pl-12 sm:pl-16 lg:grid-cols-[1fr_20rem] lg:items-center">
          <span className="absolute left-0 top-1 grid h-9 w-9 place-items-center rounded-full gradient-primary font-display text-sm font-bold text-primary-foreground shadow-glow ring-4 ring-background sm:h-11 sm:w-11 sm:text-base">
            {index + 1}
          </span>
          <div className="premium-panel rounded-3xl p-5">
            <h3 className="font-display text-lg font-bold">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
            {tip && (
              <p className="mt-3 rounded-2xl bg-primary/[0.07] px-3 py-2 text-xs leading-relaxed text-foreground/80">
                {tip}
              </p>
            )}
          </div>
          <div className="pt-6 lg:pt-0">
            <Illustration />
          </div>
        </li>
      ))}
    </ol>
  );
}
