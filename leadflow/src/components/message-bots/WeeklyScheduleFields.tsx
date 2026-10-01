import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { WeeklySchedule } from "@/types/messageBots";

const days: Array<{ key: keyof WeeklySchedule; label: string }> = [
  { key: "mon", label: "Segunda" },
  { key: "tue", label: "Terça" },
  { key: "wed", label: "Quarta" },
  { key: "thu", label: "Quinta" },
  { key: "fri", label: "Sexta" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

interface Props {
  value: WeeklySchedule;
  onChange: (value: WeeklySchedule) => void;
}

export function WeeklyScheduleFields({ value, onChange }: Props) {
  function patch(
    day: keyof WeeklySchedule,
    changes: Partial<WeeklySchedule[typeof day]>,
  ) {
    onChange({
      ...value,
      [day]: { ...value[day], ...changes },
    });
  }

  return (
    <div className="sm:col-span-2 space-y-3 rounded-lg border p-4">
      <div>
        <Label>Agenda semanal</Label>
        <p className="text-xs text-muted-foreground">
          Fuso fixo: America/Sao_Paulo
        </p>
      </div>
      {days.map(({ key, label }) => (
        <div
          key={key}
          className="grid grid-cols-[110px_1fr_1fr] items-center gap-3"
        >
          <div className="flex items-center gap-2">
            <Switch
              checked={value[key].enabled}
              onCheckedChange={(enabled) => patch(key, { enabled })}
            />
            <span className="text-sm">{label}</span>
          </div>
          <Input
            type="time"
            value={value[key].start}
            disabled={!value[key].enabled}
            onChange={(event) => patch(key, { start: event.target.value })}
          />
          <Input
            type="time"
            value={value[key].end}
            disabled={!value[key].enabled}
            onChange={(event) => patch(key, { end: event.target.value })}
          />
        </div>
      ))}
    </div>
  );
}
