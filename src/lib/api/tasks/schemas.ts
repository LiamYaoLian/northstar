import { z } from "zod";
import {
  parseQuarterlyRecurrence,
  serializeQuarterlyRecurrence,
} from "@/lib/tasks/recurrence-types";

export const recurrenceTypeSchema = z.enum([
  "none",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
]);

const recurrenceBaseSchema = z.object({
  recurrenceType: recurrenceTypeSchema.optional().default("none"),
  recurrenceDays: z.array(z.number().int()).nullable().optional(),
  recurrenceCarryOver: z.boolean().optional().default(false),
});

type RecurrenceInput = z.infer<typeof recurrenceBaseSchema>;

function normalizeRecurrence(data: RecurrenceInput): RecurrenceInput {
  let recurrenceDays = data.recurrenceDays;
  if (data.recurrenceType === "quarterly" && recurrenceDays?.length) {
    const parsed = parseQuarterlyRecurrence(recurrenceDays);
    if (parsed) {
      recurrenceDays = serializeQuarterlyRecurrence(
        parsed.monthInQuarter,
        parsed.dayOfMonth,
      );
    }
  }
  return {
    ...data,
    recurrenceDays,
    recurrenceCarryOver:
      data.recurrenceType === "weekly" ? data.recurrenceCarryOver : false,
  };
}

function refineRecurrence(data: RecurrenceInput, ctx: z.RefinementCtx): void {
  if (data.recurrenceType === "weekly") {
    if (!data.recurrenceDays || data.recurrenceDays.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "weekly recurrence requires at least one weekday",
        path: ["recurrenceDays"],
      });
      return;
    }
    if (!data.recurrenceDays.every((d) => d >= 1 && d <= 7)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "weekly recurrence days must be ISO weekdays 1-7",
        path: ["recurrenceDays"],
      });
    }
  }

  if (data.recurrenceType === "monthly") {
    if (!data.recurrenceDays || data.recurrenceDays.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "monthly recurrence requires at least one day of month",
        path: ["recurrenceDays"],
      });
      return;
    }
    if (!data.recurrenceDays.every((d) => d >= 1 && d <= 31)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "monthly recurrence days must be 1-31",
        path: ["recurrenceDays"],
      });
    }
  }

  if (data.recurrenceType === "quarterly") {
    const parsed = parseQuarterlyRecurrence(data.recurrenceDays ?? []);
    if (!parsed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "quarterly recurrence requires [monthInQuarter (1-3), dayOfMonth (1-31)]",
        path: ["recurrenceDays"],
      });
    }
  }
}

export const createTaskRecurrenceSchema = recurrenceBaseSchema
  .transform(normalizeRecurrence)
  .superRefine(refineRecurrence);

export const patchTaskRecurrenceSchema = recurrenceBaseSchema
  .partial()
  .transform((data) =>
    normalizeRecurrence({
      recurrenceType: data.recurrenceType ?? "none",
      recurrenceDays: data.recurrenceDays ?? null,
      recurrenceCarryOver: data.recurrenceCarryOver ?? false,
    }),
  )
  .superRefine((data, ctx) => {
    if (
      data.recurrenceType === "weekly" ||
      data.recurrenceType === "monthly" ||
      data.recurrenceType === "quarterly"
    ) {
      refineRecurrence(data, ctx);
    }
  });

export type CreateTaskRecurrenceInput = z.infer<typeof createTaskRecurrenceSchema>;
export type PatchTaskRecurrenceInput = z.infer<typeof patchTaskRecurrenceSchema>;

export function parseCreateTaskRecurrenceFromBody(
  body: Record<string, unknown>,
): CreateTaskRecurrenceInput | undefined {
  const hasRecurrenceField =
    "recurrenceType" in body ||
    "recurrenceDays" in body ||
    "recurrenceCarryOver" in body;
  if (!hasRecurrenceField) return undefined;

  return createTaskRecurrenceSchema.parse({
    recurrenceType: body.recurrenceType,
    recurrenceDays: body.recurrenceDays,
    recurrenceCarryOver: body.recurrenceCarryOver,
  });
}
