import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { SalesHero } from "@/components/site/SalesHero";
import { SalesVideo } from "@/components/site/SalesVideo";
import { Marquee } from "@/components/site/Marquee";
import { Services } from "@/components/site/Services";
import { HowItWorks } from "@/components/site/HowItWorks";
import { ConversionBenefits } from "@/components/site/ConversionBenefits";
import { Overhead } from "@/components/site/Overhead";
import { Pricing } from "@/components/site/Pricing";
import { Faq } from "@/components/site/Faq";
import { FinalCta } from "@/components/site/FinalCta";
import { WhatsAppSupport } from "@/components/site/WhatsAppSupport";

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
      <WhatsAppSupport />
      <SalesHero />
      <SalesVideo />
      <Services />
      <Marquee />
      <HowItWorks />
      <ConversionBenefits />
      <Overhead />
      <Pricing />
      <Faq />
      <FinalCta />
    </main>
  );
}
