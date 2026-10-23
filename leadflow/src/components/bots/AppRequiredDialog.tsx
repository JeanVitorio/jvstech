import { ArrowRight, Download, Laptop, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const reasons = [
  { icon: Laptop, text: "Os agentes rodam no app LeadFlow, instalado no seu PC com Windows." },
  { icon: ShieldCheck, text: "É o app que busca as empresas e confere o WhatsApp de cada lead." },
  { icon: Download, text: "A instalação leva poucos minutos. Depois disso, a criação é liberada." },
];

// Exibido ao tentar criar um agente antes de a empresa instalar o app desktop.
export function AppRequiredDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden rounded-[1.75rem] border-border/70 p-0">
        <div className="relative px-6 pb-2 pt-8 text-center">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 gradient-glow opacity-70" />
          <span className="relative mx-auto grid h-16 w-16 place-items-center rounded-[1.35rem] gradient-primary text-primary-foreground shadow-glow">
            <Download className="h-7 w-7" aria-hidden="true" />
          </span>
          <DialogTitle className="relative mt-5 font-display text-2xl font-bold">
            Instale o app primeiro
          </DialogTitle>
          <DialogDescription className="relative mx-auto mt-2 max-w-sm text-sm leading-relaxed">
            Para criar agentes, a sua empresa precisa ter o LeadFlow instalado e conectado em pelo
            menos um PC.
          </DialogDescription>
        </div>
        <ul className="space-y-2 px-6 py-4">
          {reasons.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/40 p-3 text-sm"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 border-t border-border/60 bg-muted/20 p-4 sm:flex-row-reverse">
          <Button
            className="h-11 flex-1 gap-2 rounded-2xl font-semibold shadow-glow"
            onClick={() => {
              onOpenChange(false);
              navigate("/installation");
            }}
          >
            Ir para a instalação
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="h-11 rounded-2xl"
            onClick={() => onOpenChange(false)}
          >
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
