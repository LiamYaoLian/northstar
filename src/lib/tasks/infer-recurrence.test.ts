import { describe, expect, it } from "vitest";
import {
  normalizeRecurrenceInference,
  ruleBasedInferRecurrence,
} from "./infer-recurrence";

describe("ruleBasedInferRecurrence", () => {
  it("detects daily from explicit keywords", () => {
    expect(ruleBasedInferRecurrence("冥想 10min 每天")).toMatchObject({
      recurrenceType: "daily",
      source: "rules",
    });
    expect(ruleBasedInferRecurrence("daily standup")).toMatchObject({
      recurrenceType: "daily",
    });
  });

  it("detects weekly with weekday tokens", () => {
    expect(ruleBasedInferRecurrence("每周三瑜伽")).toMatchObject({
      recurrenceType: "weekly",
      recurrenceDays: [3],
    });
    expect(ruleBasedInferRecurrence("Mon/Wed run")).toMatchObject({
      recurrenceType: "weekly",
      recurrenceDays: [1, 3],
    });
  });

  it("detects quarterly with explicit keywords", () => {
    expect(ruleBasedInferRecurrence("每季度1号复盘")).toMatchObject({
      recurrenceType: "quarterly",
      recurrenceDays: [1, 1],
    });
    expect(ruleBasedInferRecurrence("quarterly review")).toMatchObject({
      recurrenceType: "quarterly",
      recurrenceDays: [1, 1],
    });
    expect(ruleBasedInferRecurrence("每季度第2个月15号")).toMatchObject({
      recurrenceType: "quarterly",
      recurrenceDays: [2, 15],
    });
  });

  it("defaults to none without explicit recurrence signals", () => {
    expect(ruleBasedInferRecurrence("写 PRD")).toMatchObject({
      recurrenceType: "none",
    });
    expect(ruleBasedInferRecurrence("冥想 10min")).toMatchObject({
      recurrenceType: "none",
    });
  });
});

describe("normalizeRecurrenceInference", () => {
  it("downgrades weekly without days to none", () => {
    expect(
      normalizeRecurrenceInference({
        recurrenceType: "weekly",
        recurrenceDays: [],
        source: "openai",
      }),
    ).toMatchObject({ recurrenceType: "none" });
  });

  it("clears carryOver for daily", () => {
    expect(
      normalizeRecurrenceInference({
        recurrenceType: "daily",
        recurrenceCarryOver: true,
        source: "openai",
      }),
    ).toMatchObject({
      recurrenceType: "daily",
      recurrenceCarryOver: false,
    });
  });

  it("downgrades quarterly without days to none", () => {
    expect(
      normalizeRecurrenceInference({
        recurrenceType: "quarterly",
        recurrenceDays: [],
        source: "openai",
      }),
    ).toMatchObject({ recurrenceType: "none" });
  });
});
