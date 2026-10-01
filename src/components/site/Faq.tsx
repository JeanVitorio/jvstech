import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "O que é o JVS LeadFlow?",
    a: "É uma plataforma de prospecção que reúne bots, leads, colaboradores e funil de vendas para organizar a operação comercial em um único lugar.",
  },
  {
    q: "Como os leads são encontrados?",
    a: "Você configura os critérios da prospecção e o aplicativo executa a busca. Os contatos encontrados são enviados para o painel da equipe.",
  },
  {
    q: "Posso distribuir leads entre colaboradores?",
    a: "Sim. O líder pode criar usuários, definir acessos e indicar o responsável por cada bot ou oportunidade.",
  },
  {
    q: "Preciso instalar alguma coisa?",
    a: "O painel funciona pela web. Para executar os bots de prospecção, o aplicativo do JVS LeadFlow deve ser instalado em um computador ou servidor Windows.",
  },
  {
    q: "Como conheço o sistema?",
    a: "Entre em contato com a JVS para agendar uma demonstração. Apresentamos o fluxo completo e avaliamos a configuração adequada para sua operação.",
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
          As principais informações para entender como o JVS LeadFlow funciona.
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
