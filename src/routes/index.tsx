import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { Marquee } from "@/components/site/Marquee";
import { ChapterTwo } from "@/components/site/ChapterTwo";
import { PhoneChaos } from "@/components/site/PhoneChaos";
import { Overhead } from "@/components/site/Overhead";
import { Pricing } from "@/components/site/Pricing";
import { Faq } from "@/components/site/Faq";
import { FinalCta } from "@/components/site/FinalCta";
import { SectionVeil } from "@/components/site/SectionVeil";
import { WhatsAppPrompt } from "@/components/site/WhatsAppPrompt";

const title = "JVS LeadFlow — Prospecção inteligente e gestão de vendas";
const description =
  "Automatize a busca por empresas, centralize seus leads e acompanhe todo o funil de vendas com o JVS LeadFlow.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative bg-background">
      <Nav />
      <WhatsAppPrompt />
      <Hero />
      <Marquee />
      <ChapterTwo />
      <SectionVeil label="benefícios" flip />
      <PhoneChaos />
      <SectionVeil label="operação" />
      <Overhead />
      <SectionVeil label="planos" flip />
      <Pricing />
      <Faq />
      <SectionVeil label="demonstração" flip />
      <FinalCta />
    </main>
  );
}
