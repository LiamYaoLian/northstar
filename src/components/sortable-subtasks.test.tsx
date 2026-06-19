/**
 * @vitest-environment happy-dom
 */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SortableSubtasks } from "./sortable-subtasks";
import { LocaleProvider } from "@/lib/i18n/context";
import type { Subtask } from "@/lib/db/schema";

const subtask: Subtask = {
  id: "s1",
  userId: null,
  parentTaskId: "t1",
  title: "Draft outline",
  sortOrder: 0,
  isDone: false,
  estimatedMin: 15,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function renderSubtasks(
  props: Partial<React.ComponentProps<typeof SortableSubtasks>> = {},
) {
  return render(
    <LocaleProvider>
      <SortableSubtasks
        taskId="t1"
        subtasks={[subtask]}
        onReorder={vi.fn()}
        {...props}
      />
    </LocaleProvider>,
  );
}

describe("SortableSubtasks", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders subtask title as read-only text when onUpdateTitle is omitted", () => {
    renderSubtasks();
    expect(screen.getByText("Draft outline")).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: /编辑子任务/i })).toBeNull();
  });

  it("calls onUpdateTitle when title is edited and blurred", async () => {
    const onUpdateTitle = vi.fn();
    const user = userEvent.setup();
    renderSubtasks({ onUpdateTitle });

    const input = screen.getByRole("textbox", { name: /编辑子任务/i });
    await user.clear(input);
    await user.type(input, "Write outline");
    await user.tab();

    expect(onUpdateTitle).toHaveBeenCalledWith("s1", "Write outline");
  });

  it("reverts empty title on blur", async () => {
    const onUpdateTitle = vi.fn();
    const user = userEvent.setup();
    renderSubtasks({ onUpdateTitle });

    const input = screen.getByRole("textbox", { name: /编辑子任务/i });
    await user.clear(input);
    await user.tab();

    expect(onUpdateTitle).not.toHaveBeenCalled();
    expect((input as HTMLInputElement).value).toBe("Draft outline");
  });

  it("renders subtask estimate as read-only text when onUpdateEstimatedMin is omitted", () => {
    renderSubtasks();
    expect(screen.getByText("15分钟")).toBeTruthy();
  });

  it("calls onUpdateEstimatedMin when estimate is edited and blurred", async () => {
    const onUpdateEstimatedMin = vi.fn();
    const user = userEvent.setup();
    renderSubtasks({ onUpdateEstimatedMin });

    await user.click(screen.getByRole("button", { name: /编辑估计用时/i }));
    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "30");
    await user.tab();

    expect(onUpdateEstimatedMin).toHaveBeenCalledWith("s1", 30);
  });
});
