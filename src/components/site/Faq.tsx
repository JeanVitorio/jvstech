import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Quanto tempo demora a ficar pronto?",
    a: "Uma landing page fica pronta em 5 a 10 dias. Sites institucionais entre 2 e 3 semanas. Sistemas dependem do escopo e são definidos na proposta, com prazos por etapa.",
  },
  {
    q: "Como funciona o pagamento?",
    a: "50% para iniciar e 50% na entrega. Planos de manutenção são mensais e podem ser cancelados quando quiser, sem multa.",
  },
  {
    q: "O site vai aparecer no Google?",
    a: "Entregamos toda a estrutura técnica de SEO: velocidade, semântica, metadados, sitemap e dados estruturados. O plano Posicionamento cuida do trabalho contínuo de conteúdo e palavras-chave.",
  },
  {
    q: "Eu consigo alterar o conteúdo depois?",
    a: "Sim. Entregamos painel de edição quando o projeto pede, e pequenas alterações estão incluídas nos planos de manutenção.",
  },
  {
    q: "Vocês integram com WhatsApp, CRM e pagamentos?",
    a: "Sim. Ligamos o site às ferramentas que já usa — WhatsApp, CRM, e-mail marketing, gateways de pagamento e automações internas.",
  },
  {
    q: "E se eu já tiver um site?",
    a: "Fazemos o diagnóstico gratuito, mostramos o que está a travar as conversões e propomos reformulação ou migração, mantendo o histórico de SEO.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="relative overflow-hidden py-24 md:py-32">
      <div className="tech-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -left-32 top-1/2 h-80 w-80 rounded-full bg-primary/10 blur-[130px]" />

      <div className="relative mx-auto max-w-3xl px-6">
        <h2 className="text-center font-display text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="text-brand">Perguntas</span> Frequentes
        </h2>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Tudo o que precisa de saber antes de pedir o seu orçamento.
        </p>

        <Accordion type="single" collapsible className="mt-12 space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem
              key={f.q}
              value={`item-${i}`}
              className="glass-card overflow-hidden rounded-xl border-b px-5"
            >
              <AccordionTrigger className="text-left text-sm hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-xs leading-relaxed text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
