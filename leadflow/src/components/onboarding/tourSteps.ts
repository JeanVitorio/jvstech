import { Bot, CircleHelp, Download, Rocket, Sparkles, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface TourStep {
  id: string;
  // Valor do atributo data-tour do elemento destacado; sem alvo, o balão fica centralizado.
  target?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  highlights?: string[];
  // Textos alternativos quando a empresa já tem o app instalado.
  installedTitle?: string;
  installedDescription?: string;
}

export const tourSteps: TourStep[] = [
  {
    id: "welcome",
    icon: Sparkles,
    title: "Bem-vindo ao LeadFlow",
    description:
      "Em três passos você começa a receber leads prontos para conversar no WhatsApp. Vamos mostrar onde fica cada coisa.",
    highlights: ["Instale o app no PC", "Crie seus agentes", "Receba os leads"],
  },
  {
    id: "installation",
    target: "installation",
    icon: Download,
    title: "Primeiro: instale o app no seu PC",
    description:
      "Os agentes trabalham dentro do aplicativo LeadFlow para Windows. Baixe aqui, instale e entre com este mesmo e-mail e senha. Sem o app, os agentes não buscam leads.",
  },
  {
    id: "agents",
    target: "agentes",
    icon: Bot,
    title: "Depois: crie seus agentes",
    description:
      "Com o app instalado, crie aqui seus agentes. Escolha o nicho e as cidades, e eles buscam empresas no Google Maps enquanto o app estiver aberto.",
  },
  {
    id: "leads",
    target: "leads",
    icon: Users,
    title: "Seus leads chegam aqui",
    description:
      "Os leads encontrados pelos agentes ficam todos aqui. Daqui você já chama o cliente no WhatsApp com um clique.",
  },
  {
    id: "faq",
    target: "duvidas",
    icon: CircleHelp,
    title: "Ficou com alguma dúvida?",
    description:
      "Aqui você encontra respostas rápidas sobre instalação, agentes, leads e planos, e pode falar com a gente pelo WhatsApp.",
  },
  {
    id: "done",
    icon: Rocket,
    title: "Tudo pronto para começar",
    description:
      "O próximo passo é instalar o app no seu PC. Leva poucos minutos e, depois disso, seus agentes já podem trabalhar.",
    installedTitle: "Seu app já está conectado",
    installedDescription:
      "O LeadFlow já está instalado em um PC da sua empresa. Agora é só criar seu primeiro agente e deixar o app aberto.",
  },
];
