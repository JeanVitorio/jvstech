import { Bot, CreditCard, Download, Rocket, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface FaqCategory {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export const SUPPORT_WHATSAPP_URL =
  "https://wa.me/5546991163405?text=Ol%C3%A1%21%20Tenho%20uma%20d%C3%BAvida%20sobre%20o%20LeadFlow.";

export const faqCategories: FaqCategory[] = [
  { id: "start", label: "Primeiros passos", icon: Rocket },
  { id: "app", label: "App e instalação", icon: Download },
  { id: "agents", label: "Agentes", icon: Bot },
  { id: "leads", label: "Leads e WhatsApp", icon: Users },
  { id: "billing", label: "Planos e pagamento", icon: CreditCard },
  { id: "account", label: "Conta e segurança", icon: ShieldCheck },
];

export const faqItems: FaqItem[] = [
  {
    id: "how-it-works",
    category: "start",
    question: "Como o LeadFlow funciona?",
    answer:
      "Você instala o app LeadFlow no seu PC, cria agentes de prospecção aqui na Web e eles buscam empresas no Google Maps pelo nicho e pelas cidades que você escolher. Os leads encontrados aparecem automaticamente na página Leads.",
  },
  {
    id: "first-steps",
    category: "start",
    question: "Por onde eu começo?",
    answer:
      "São três passos: 1) instale o app no PC pela página Instalação; 2) entre no app com o mesmo e-mail e senha da Web; 3) crie seu primeiro agente em Agentes de Prospecção e clique em Iniciar.",
  },
  {
    id: "why-app",
    category: "app",
    question: "Por que preciso instalar um app no PC?",
    answer:
      "Os agentes rodam dentro do app LeadFlow. É ele que pesquisa as empresas e confere se o número de cada lead abre conversa no WhatsApp. A Web serve para configurar, acompanhar e trabalhar os leads.",
  },
  {
    id: "requirements",
    category: "app",
    question: "Quais são os requisitos do computador?",
    answer:
      "Um PC com Windows 10 ou 11 de 64 bits e internet estável. Não é preciso instalar Python, Node.js ou qualquer outra coisa: o instalador já traz tudo.",
  },
  {
    id: "mac",
    category: "app",
    question: "Funciona no Mac ou no celular?",
    answer:
      "O app que roda os agentes é só para Windows. Já a Web funciona em qualquer navegador, inclusive no Mac e no celular, para você acompanhar os agentes e os leads de onde estiver.",
  },
  {
    id: "smartscreen",
    category: "app",
    question: "Apareceu um aviso azul do Windows ao instalar. É seguro?",
    answer:
      "Sim. É o Windows SmartScreen, que avisa sobre programas novos. Clique em \"Mais informações\" e depois em \"Executar assim mesmo\". Baixe sempre pelo botão da página Instalação.",
  },
  {
    id: "keep-open",
    category: "app",
    question: "Preciso deixar o PC ligado?",
    answer:
      "Sim. Os agentes trabalham enquanto o PC estiver ligado e o app aberto. Se você marcou \"Iniciar o servidor com o Windows\" na instalação, o app volta sozinho quando o PC liga.",
  },
  {
    id: "updates",
    category: "app",
    question: "Como atualizo o app?",
    answer:
      "Não precisa fazer nada: o app procura novas versões a cada quatro horas e se atualiza sozinho. Se quiser forçar, abra a página Instalação dentro do app e clique em \"Buscar atualização agora\".",
  },
  {
    id: "create-agent",
    category: "agents",
    question: "Por que não consigo criar um agente?",
    answer:
      "A criação de agentes é liberada depois que o app é instalado e conectado em pelo menos um PC da sua empresa. Instale pela página Instalação e entre no app com a sua conta.",
  },
  {
    id: "agent-config",
    category: "agents",
    question: "O que eu configuro em um agente?",
    answer:
      "O termo de busca e o nicho, as cidades, filtros como quantidade mínima de avaliações, ter ou não site e palavras para incluir ou excluir. Quanto mais específico, melhores os leads.",
  },
  {
    id: "agent-controls",
    category: "agents",
    question: "Posso pausar ou parar um agente?",
    answer:
      "Sim. No cartão de cada agente há os botões Iniciar, Pausar, Continuar e Parar. Ao pausar, ele guarda onde parou e continua do mesmo ponto depois.",
  },
  {
    id: "agent-pcs",
    category: "agents",
    question: "Posso usar mais de um PC?",
    answer:
      "Pode. Instale o app em cada PC e entre com uma conta da sua empresa. Ao iniciar um agente, você escolhe em qual PC ele vai rodar.",
  },
  {
    id: "lead-source",
    category: "leads",
    question: "De onde vêm os leads?",
    answer:
      "De empresas cadastradas no Google Maps que combinam com o nicho, as cidades e os filtros do seu agente.",
  },
  {
    id: "lead-whatsapp",
    category: "leads",
    question: "Todos os leads têm WhatsApp?",
    answer:
      "Sim. Antes de salvar, o LeadFlow confere se o número abre conversa no WhatsApp. Empresas sem telefone ou com número que não está no WhatsApp são descartadas e não contam no seu plano.",
  },
  {
    id: "lead-contact",
    category: "leads",
    question: "Como falo com um lead?",
    answer:
      "Na página Leads, use o atalho de WhatsApp do lead para abrir a conversa já com uma mensagem inicial. Depois, acompanhe a negociação no Funil de Vendas.",
  },
  {
    id: "plans",
    category: "billing",
    question: "Quais planos existem?",
    answer:
      "Free, com 50 leads por mês; Básico, com 500; Plus, com 1.500; e Pro, com 3.000. Você vê o seu consumo em Plano e consumo.",
  },
  {
    id: "limit",
    category: "billing",
    question: "O que acontece quando acabam os leads do mês?",
    answer:
      "Os agentes param de salvar novos leads até o próximo ciclo mensal. Se precisar de mais, faça upgrade em Plano e consumo: o novo limite vale na hora.",
  },
  {
    id: "cancel",
    category: "billing",
    question: "Como troco de plano ou cancelo?",
    answer:
      "Para mudar de plano, escolha o novo em Plano e consumo. Para atualizar o cartão, ver faturas ou cancelar, clique em \"Gerenciar cobrança\" na mesma página.",
  },
  {
    id: "password",
    category: "account",
    question: "Esqueci minha senha. E agora?",
    answer:
      "Na tela de login, clique em \"Esqueci minha senha\" e siga o link que enviamos para o seu e-mail.",
  },
  {
    id: "team",
    category: "account",
    question: "Posso colocar minha equipe no LeadFlow?",
    answer:
      "Sim. O proprietário ou um administrador da empresa adiciona pessoas em Colaboradores. Cada uma entra com o próprio e-mail e senha.",
  },
  {
    id: "update-whatsapp",
    category: "account",
    question: "Como altero meu WhatsApp ou meus dados?",
    answer:
      "Clique na sua foto no canto superior direito, abra Meu perfil, altere os dados e salve.",
  },
  {
    id: "data-safety",
    category: "account",
    question: "Meus dados estão seguros?",
    answer:
      "Sim. Cada empresa só enxerga os próprios agentes e leads, o acesso é protegido por login e a conexão é sempre criptografada.",
  },
];
