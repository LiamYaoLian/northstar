import { useLocale } from "@/lib/i18n/context";
import type { PriorityFactors } from "./types";
import { formatFactorPercent } from "./utils";

type TaskPriorityPanelProps = {
  factors: PriorityFactors;
};

export function TaskPriorityPanel({ factors }: TaskPriorityPanelProps) {
  const { t } = useLocale();

  const rows: { label: string; value: number }[] = [
    { label: t.taskCard.factorStrategic, value: factors.strategicUrgency },
    { label: t.taskCard.factorDeadline, value: factors.deadlinePressure },
    { label: t.taskCard.factorIntimidation, value: factors.intimidationEscalation },
    { label: t.taskCard.factorStaleness, value: factors.staleness },
  ];

  return (
    <div className="space-y-1 rounded-lg bg-neutral-50 p-3 text-xs">
      {rows.map(({ label, value }) => (
        <div key={label}>
          {label}: {formatFactorPercent(value)}
        </div>
      ))}
    </div>
  );
}
