import { z } from "zod";

export const recurrenceTypeSchema = z.enum(["none", "daily", "weekly"]);

const recurrenceBaseSchema = z.object({
  recurrenceType: recurrenceTypeSchema.optional().default("none"),
  recurrenceDays: z.array(z.number().int().min(1).max(7)).nullable().optional(),
  recurrenceCarryOver: z.boolean().optional().default(false),
});

type RecurrenceInput = z.infer<typeof recurrenceBaseSchema>;

function normalizeRecurrence(data: RecurrenceInput): RecurrenceInput {
  return {
    ...data,
    recurrenceCarryOver:
      data.recurrenceType === "daily" ? false : data.recurrenceCarryOver,
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
    if (data.recurrenceType === "weekly") {
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
