/**
 * @vitest-environment happy-dom
 */
import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskCard } from "./index";
import { LocaleProvider } from "@/lib/i18n/context";
import { TimerProvider } from "@/components/timer-provider";
import { makeTask } from "@/lib/test-fixtures";

function renderTaskCard(
  props: Partial<React.ComponentProps<typeof TaskCard>> = {},
) {
  const task = makeTask({
    title: "Prepare deck",
    priorityScore: 0.82,
    priorityFactors: JSON.stringify({
      strategicUrgency: 0.5,
      deadlinePressure: 0.2,
      intimidationEscalation: 0,
      dependencyBlocker: 0,
      staleness: 0.1,
      recentlyDonePenalty: 0,
    }),
  }) as React.ComponentProps<typeof TaskCard>["task"];
  task.pillarName = "工作";
  task.pillarColor = "#3b82f6";

  return render(
    <LocaleProvider>
      <TimerProvider>
        <TaskCard
          task={task}
          rank={1}
          onComplete={vi.fn()}
          onLogTime={vi.fn()}
          {...props}
        />
      </TimerProvider>
    </LocaleProvider>,
  );
}

describe("TaskCard", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ session: null }),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders title, rank, and priority score", () => {
    renderTaskCard();
    expect(screen.getByText("Prepare deck")).toBeTruthy();
    expect(screen.getByText("#1")).toBeTruthy();
    expect(screen.getByText(/82/)).toBeTruthy();
  });

  it("updates task title on blur when onUpdateTitle is provided", async () => {
    const onUpdateTitle = vi.fn();
    const user = userEvent.setup();
    renderTaskCard({ onUpdateTitle });

    const input = screen.getByRole("textbox", { name: "编辑任务" });
    await user.clear(input);
    await user.type(input, "Ship deck");
    await user.tab();

    expect(onUpdateTitle).toHaveBeenCalledWith("t1", "Ship deck");
  });

  it("shows priority factor panel when why button clicked", async () => {
    const user = userEvent.setup();
    renderTaskCard();

    await user.click(screen.getByRole("button", { name: /为什么排这里/i }));

    expect(screen.getByText(/战略纠偏: 50/)).toBeTruthy();
    expect(screen.getByText(/截止压力: 20/)).toBeTruthy();
  });

  it("calls onComplete when complete clicked", async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    renderTaskCard({ onComplete });

    await user.click(screen.getByRole("button", { name: "完成" }));

    expect(onComplete).toHaveBeenCalledWith("t1");
  });
});
