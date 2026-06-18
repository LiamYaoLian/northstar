import { describe, it, expect } from "vitest";
import {
  listCompletionEvents,
  recordCompletionEvent,
  summarizeCompletionsByPillar,
} from "./completions";

describe("completions service", () => {
  it("exports recordCompletionEvent for updateTask transaction", () => {
    expect(typeof recordCompletionEvent).toBe("function");
  });

  it("exports listCompletionEvents", () => {
    expect(typeof listCompletionEvents).toBe("function");
  });

  it("exports summarizeCompletionsByPillar for Alignment card", () => {
    expect(typeof summarizeCompletionsByPillar).toBe("function");
  });
});
