import { createFileRoute } from "@tanstack/react-router";
import { HeroWolf } from "@/components/site/HeroWolf";
import { CraftSection } from "@/components/site/CraftSection";
import { LogoBridge } from "@/components/site/LogoBridge";
import { PackScroll } from "@/components/site/PackScroll";
import { PhoneChaos } from "@/components/site/PhoneChaos";
import { OverheadSection } from "@/components/site/OverheadSection";
import { FinalHowl } from "@/components/site/FinalHowl";
import { SectionVeil } from "@/components/site/SectionVeil";

const title = "JVS Alcateia — Sites e sistemas que caçam clientes";
const description =
  "Landing pages, sites e sistemas sob medida focados em conversão real. Estratégia, performance e automação que transformam visitantes em clientes pagantes.";

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
      <HeroWolf />
      <SectionVeil label="o arsenal" />
      <CraftSection />
      <SectionVeil label="a marca" flip />
      <LogoBridge />
      <SectionVeil label="o rastro" />
      <PackScroll />
      <SectionVeil label="a caça" flip />
      <PhoneChaos />
      <SectionVeil label="de cima" />
      <OverheadSection />
      <SectionVeil label="último uivo" flip />
      <FinalHowl />
    </main>
  );
}
