import { useEffect, useState } from "react";
import { Clock3, MessageCircle, ShieldCheck } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const REMINDER_DELAY = 60_000;
const WHATSAPP_URL =
  "https://wa.me/5546991163405?text=Ol%C3%A1%21%20Vim%20pelo%20site%20da%20JVS%20Tech%20e%20gostaria%20de%20conversar.";

export function WhatsAppPrompt() {
  const [open, setOpen] = useState(false);
  const [reminder, setReminder] = useState(0);
  const [contacted, setContacted] = useState(false);

  useEffect(() => {
    if (contacted) return;

    const timer = window.setTimeout(() => {
      setOpen(true);
    }, REMINDER_DELAY);

    return () => window.clearTimeout(timer);
  }, [contacted, reminder]);

  const postpone = () => {
    setOpen(false);
    setReminder((current) => current + 1);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && open) {
      postpone();
      return;
    }

    setOpen(nextOpen);
  };

  const handleContact = () => {
    setContacted(true);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] overflow-hidden rounded-3xl border-primary/35 bg-[linear-gradient(160deg,oklch(0.18_0.03_235),oklch(0.115_0.018_240))] p-0 shadow-[0_30px_100px_-20px_oklch(0.72_0.16_215_/_55%)] sm:max-w-md">
        <div className="absolute inset-x-8 top-0 h-1 rounded-full bg-brand" />
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/15 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-primary/15 blur-[90px]" />

        <div className="relative p-7 sm:p-9">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand shadow-[var(--glow-ice)]">
            <MessageCircle
              className="h-7 w-7 text-primary-foreground"
              aria-hidden="true"
            />
          </div>

          <p className="label-xs text-primary">◆ Podemos ajudar?</p>

          <DialogTitle className="mt-3 font-display text-2xl font-semibold leading-tight sm:text-3xl">
            Vamos conversar sobre o{" "}
            <span className="text-brand">seu projeto?</span>
          </DialogTitle>

          <DialogDescription className="mt-3 text-sm leading-relaxed">
            Chame a JVS Tech no WhatsApp e conte o que precisa. A primeira
            conversa é gratuita e sem compromisso.
          </DialogDescription>

          <div className="mt-6 space-y-3 text-xs text-foreground/80">
            <p className="flex items-center gap-2.5">
              <ShieldCheck
                className="h-4 w-4 shrink-0 text-accent"
                aria-hidden="true"
              />
              Atendimento direto, sem formulários
            </p>
            <p className="flex items-center gap-2.5">
              <Clock3
                className="h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              Resposta em até 2 horas
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              onClick={handleContact}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-bold text-primary-foreground shadow-[var(--glow-ice)] transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Chamar agora
            </a>

            <button
              type="button"
              onClick={postpone}
              className="min-h-11 rounded-full border border-border bg-white/[0.03] px-6 py-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Agora não, lembrar em 1 minuto
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
