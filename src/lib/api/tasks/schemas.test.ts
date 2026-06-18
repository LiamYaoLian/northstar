import { describe, it, expect } from "vitest";
import {
  createTaskRecurrenceSchema,
  patchTaskRecurrenceSchema,
} from "./schemas";

describe("createTaskRecurrenceSchema", () => {
  it("defaults to none recurrence", () => {
    const result = createTaskRecurrenceSchema.parse({});
    expect(result.recurrenceType).toBe("none");
    expect(result.recurrenceCarryOver).toBe(false);
  });

  it("accepts daily with carryOver forced false", () => {
    const result = createTaskRecurrenceSchema.parse({
      recurrenceType: "daily",
      recurrenceCarryOver: true,
    });
    expect(result.recurrenceType).toBe("daily");
    expect(result.recurrenceCarryOver).toBe(false);
  });

  it("requires at least one weekday for weekly", () => {
    expect(() =>
      createTaskRecurrenceSchema.parse({
        recurrenceType: "weekly",
        recurrenceDays: [],
      }),
    ).toThrow();
  });

  it("accepts weekly with valid ISO weekdays", () => {
    const result = createTaskRecurrenceSchema.parse({
      recurrenceType: "weekly",
      recurrenceDays: [1, 3],
      recurrenceCarryOver: true,
    });
    expect(result.recurrenceDays).toEqual([1, 3]);
    expect(result.recurrenceCarryOver).toBe(true);
  });

  it("rejects invalid recurrence type", () => {
    expect(() =>
      createTaskRecurrenceSchema.parse({ recurrenceType: "monthly" }),
    ).toThrow();
  });
});

describe("patchTaskRecurrenceSchema", () => {
  it("allows partial weekly update", () => {
    const result = patchTaskRecurrenceSchema.parse({
      recurrenceType: "weekly",
      recurrenceDays: [2, 4],
    });
    expect(result.recurrenceDays).toEqual([2, 4]);
  });

  it("clears carryOver when switching to daily", () => {
    const result = patchTaskRecurrenceSchema.parse({
      recurrenceType: "daily",
      recurrenceCarryOver: true,
    });
    expect(result.recurrenceCarryOver).toBe(false);
  });

  it("allows switching to none without recurrenceDays", () => {
    const result = patchTaskRecurrenceSchema.parse({
      recurrenceType: "none",
    });
    expect(result.recurrenceType).toBe("none");
  });

  it("rejects weekday 0 or 8", () => {
    expect(() =>
      createTaskRecurrenceSchema.parse({
        recurrenceType: "weekly",
        recurrenceDays: [0, 1],
      }),
    ).toThrow();
    expect(() =>
      createTaskRecurrenceSchema.parse({
        recurrenceType: "weekly",
        recurrenceDays: [1, 8],
      }),
    ).toThrow();
  });
});
