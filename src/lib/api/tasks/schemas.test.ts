import { describe, it, expect } from "vitest";
import {
  createTaskRecurrenceSchema,
  parseCreateTaskRecurrenceFromBody,
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

  it("accepts monthly with day of month", () => {
    const result = createTaskRecurrenceSchema.parse({
      recurrenceType: "monthly",
      recurrenceDays: [15],
    });
    expect(result.recurrenceDays).toEqual([15]);
    expect(result.recurrenceCarryOver).toBe(false);
  });

  it("requires at least one day for monthly", () => {
    expect(() =>
      createTaskRecurrenceSchema.parse({
        recurrenceType: "monthly",
        recurrenceDays: [],
      }),
    ).toThrow();
  });

  it("accepts quarterly with month slot and day of month", () => {
    const result = createTaskRecurrenceSchema.parse({
      recurrenceType: "quarterly",
      recurrenceDays: [2, 1],
    });
    expect(result.recurrenceDays).toEqual([2, 1]);
    expect(result.recurrenceCarryOver).toBe(false);
  });

  it("normalizes legacy quarterly single-day to slot 1", () => {
    const result = createTaskRecurrenceSchema.parse({
      recurrenceType: "quarterly",
      recurrenceDays: [15],
    });
    expect(result.recurrenceDays).toEqual([1, 15]);
  });

  it("requires valid quarterly recurrenceDays", () => {
    expect(() =>
      createTaskRecurrenceSchema.parse({
        recurrenceType: "quarterly",
        recurrenceDays: [],
      }),
    ).toThrow();
    expect(() =>
      createTaskRecurrenceSchema.parse({
        recurrenceType: "quarterly",
        recurrenceDays: [4, 15],
      }),
    ).toThrow();
  });

  it("accepts yearly with calendar month and day", () => {
    const result = createTaskRecurrenceSchema.parse({
      recurrenceType: "yearly",
      recurrenceDays: [3, 15],
    });
    expect(result.recurrenceDays).toEqual([3, 15]);
  });

  it("requires valid yearly recurrenceDays", () => {
    expect(() =>
      createTaskRecurrenceSchema.parse({
        recurrenceType: "yearly",
        recurrenceDays: [3],
      }),
    ).toThrow();
    expect(() =>
      createTaskRecurrenceSchema.parse({
        recurrenceType: "yearly",
        recurrenceDays: [13, 15],
      }),
    ).toThrow();
  });

  it("rejects invalid recurrence type", () => {
    expect(() =>
      createTaskRecurrenceSchema.parse({ recurrenceType: "yearly" }),
    ).toThrow();
  });
});

describe("parseCreateTaskRecurrenceFromBody", () => {
  it("returns undefined when body has no recurrence fields", () => {
    expect(parseCreateTaskRecurrenceFromBody({ title: "test" })).toBeUndefined();
  });

  it("parses recurrence when any recurrence field is present", () => {
    expect(
      parseCreateTaskRecurrenceFromBody({ recurrenceType: "daily" }),
    ).toMatchObject({ recurrenceType: "daily" });
    expect(
      parseCreateTaskRecurrenceFromBody({
        recurrenceType: "none",
      }),
    ).toMatchObject({ recurrenceType: "none" });
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
