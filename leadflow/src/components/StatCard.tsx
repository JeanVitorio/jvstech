import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "destructive" | "accent";
}

const toneMap = {
  default: "text-primary bg-primary/10",
  accent: "text-accent bg-accent/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  destructive: "text-destructive bg-destructive/10",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "default" }: Props) {
  return (
    <Card className="group relative overflow-hidden p-6 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lift">
      <div className="gradient-glow pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-center justify-between mb-4 relative">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${toneMap[tone]}`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="relative font-display text-3xl font-bold tracking-[-0.04em] tabular-nums">
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground mt-1.5 relative">{hint}</p>}
    </Card>
  );
}
