export type RecurrenceType = "none" | "daily" | "weekly";

export type RecurrenceTaskFields = {
  recurrenceType: RecurrenceType;
  recurrenceDays: string | null;
  recurrenceCarryOver: boolean;
  status: string;
  completedAt: string | null;
};

export function parseRecurrenceDays(json: string | null): number[] | null {
  if (json === null) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    if (!parsed.every((v) => typeof v === "number" && Number.isInteger(v))) {
      return null;
    }
    return parsed as number[];
  } catch {
    return null;
  }
}

export function toRecurrenceFields(task: {
  recurrenceType: RecurrenceType | string;
  recurrenceDays: string | null;
  recurrenceCarryOver: boolean | number;
  status: string;
  completedAt: string | null;
}): RecurrenceTaskFields {
  return {
    recurrenceType: task.recurrenceType as RecurrenceType,
    recurrenceDays: task.recurrenceDays,
    recurrenceCarryOver: Boolean(task.recurrenceCarryOver),
    status: task.status,
    completedAt: task.completedAt,
  };
}
