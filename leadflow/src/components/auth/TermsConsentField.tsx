import { Checkbox } from "@/components/ui/checkbox";
import { LEGAL_URLS } from "@/lib/legal";
import { cn } from "@/lib/utils";

interface TermsConsentFieldProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

const linkClass = "font-semibold text-primary underline underline-offset-2 hover:text-primary/80";

// Caixa de aceite dos Termos de Uso e da Política de Privacidade.
export function TermsConsentField({ id, checked, onCheckedChange, className }: TermsConsentFieldProps) {
  return (
    <div className={cn("flex items-start gap-3 text-sm leading-relaxed", className)}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
        aria-required="true"
      />
      <label htmlFor={id} className="cursor-pointer">
        Li e aceito os{" "}
        <a href={LEGAL_URLS.terms} target="_blank" rel="noreferrer" className={linkClass}>
          Termos de Uso
        </a>{" "}
        e a{" "}
        <a href={LEGAL_URLS.privacy} target="_blank" rel="noreferrer" className={linkClass}>
          Política de Privacidade
        </a>
        .
      </label>
    </div>
  );
}
