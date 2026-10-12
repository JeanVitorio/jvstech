import { MessageCircle } from "lucide-react";

const WHATSAPP_URL =
  "https://wa.me/5546991163405?text=Ol%C3%A1%21%20Gostaria%20de%20conhecer%20o%20JVS%20LeadFlow.";

export function WhatsAppSupport() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com a JVS pelo WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-background/90 text-primary shadow-[var(--glow-ice)] backdrop-blur transition-transform hover:scale-105 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-3"
    >
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
      <span className="hidden text-xs font-semibold sm:inline">Precisa de ajuda?</span>
    </a>
  );
}
