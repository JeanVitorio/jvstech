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

const title = "JVS Tech — Sites e sistemas que vendem todos os dias";
const description =
  "Criamos sites, landing pages e sistemas sob medida focados em conversão real. Estratégia, performance e UX que transformam visitantes em clientes pagantes.";

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
      <SectionVeil label="resultados" flip />
      <PhoneChaos />
      <SectionVeil label="diagnóstico" />
      <Overhead />
      <SectionVeil label="planos" flip />
      <Pricing />
      <Faq />
      <SectionVeil label="contacto" flip />
      <FinalCta />
    </main>
  );
}
