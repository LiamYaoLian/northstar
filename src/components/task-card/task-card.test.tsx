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

  it("renders title and rank", () => {
    renderTaskCard();
    expect(screen.getByText("Prepare deck")).toBeTruthy();
    expect(screen.getByText("#1")).toBeTruthy();
    expect(screen.queryByText(/优先级/)).toBeNull();
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

  it("calls onComplete when complete clicked", async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    renderTaskCard({ onComplete });

    await user.click(screen.getByRole("button", { name: "完成" }));

    expect(onComplete).toHaveBeenCalledWith("t1");
  });

  it("shows recurrence frequency in metadata without opening edit panel", () => {
    const task = makeTask({
      title: "Weekly sync",
      recurrenceType: "weekly",
      recurrenceDays: JSON.stringify([1, 3]),
      recurrenceCarryOver: true,
    }) as React.ComponentProps<typeof TaskCard>["task"];
    task.pillarName = "工作";
    task.pillarColor = "#3b82f6";

    render(
      <LocaleProvider>
        <TimerProvider>
          <TaskCard
            task={task}
            onUpdateRecurrence={vi.fn()}
          />
        </TimerProvider>
      </LocaleProvider>,
    );

    expect(screen.getByText(/每周 一、三 · 补做/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "每天" })).toBeNull();
  });

  it("shows one-off recurrence summary without opening edit panel", () => {
    renderTaskCard({ onUpdateRecurrence: vi.fn() });
    expect(screen.getByText("不重复")).toBeTruthy();
  });

  it("saves recurrence immediately when editing without clicking add", async () => {
    const onUpdateRecurrence = vi.fn();
    const user = userEvent.setup();
    renderTaskCard({ onUpdateRecurrence });

    await user.click(screen.getByRole("button", { name: "重复" }));
    await user.click(screen.getByRole("button", { name: "每天" }));

    expect(onUpdateRecurrence).toHaveBeenCalledWith("t1", {
      recurrenceType: "daily",
      recurrenceDays: [],
      recurrenceCarryOver: false,
    });
    expect(screen.queryByRole("button", { name: "添加" })).toBeNull();
  });
});
