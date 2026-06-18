/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTaskCardForms } from "./use-task-card-forms";

describe("useTaskCardForms", () => {
  it("submits breakdown with trimmed prompt", async () => {
    const onBreakdown = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useTaskCardForms({ taskId: "t1", onBreakdown }),
    );

    act(() => {
      result.current.setAiPrompt("  focus on step 1  ");
    });

    await act(async () => {
      await result.current.handleBreakdown({
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent);
    });

    expect(onBreakdown).toHaveBeenCalledWith("t1", "focus on step 1");
    expect(result.current.aiPrompt).toBe("");
    expect(result.current.showAiBreakdown).toBe(false);
  });

  it("submits manual subtask and resets form", async () => {
    const onAddSubtask = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useTaskCardForms({ taskId: "t1", onAddSubtask }),
    );

    act(() => {
      result.current.setSubtaskTitle("Draft outline");
      result.current.setAsEntryPoint(true);
    });

    await act(async () => {
      await result.current.handleAddSubtask({
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent);
    });

    expect(onAddSubtask).toHaveBeenCalledWith("t1", "Draft outline", true);
    expect(result.current.subtaskTitle).toBe("");
    expect(result.current.asEntryPoint).toBe(false);
  });

  it("ignores empty subtask title", async () => {
    const onAddSubtask = vi.fn();
    const { result } = renderHook(() =>
      useTaskCardForms({ taskId: "t1", onAddSubtask }),
    );

    await act(async () => {
      await result.current.handleAddSubtask({
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent);
    });

    expect(onAddSubtask).not.toHaveBeenCalled();
  });
});
