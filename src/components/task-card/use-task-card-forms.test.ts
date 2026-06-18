/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTaskCardForms } from "./use-task-card-forms";

describe("useTaskCardForms", () => {
  it("submits breakdown with trimmed prompt", async () => {
    const onBreakdown = vi.fn().mockResolvedValue(null);
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

  it("stores preview instead of closing when breakdown returns diff", async () => {
    const preview = {
      preview: true as const,
      diff: [{ type: "added" as const, title: "New step" }],
      proposed: [{ title: "New step" }],
      source: "rules" as const,
    };
    const onBreakdown = vi.fn().mockResolvedValue(preview);
    const { result } = renderHook(() =>
      useTaskCardForms({ taskId: "t1", onBreakdown }),
    );

    await act(async () => {
      await result.current.handleBreakdown({
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent);
    });

    expect(result.current.pendingPreview).toEqual(preview);
  });

  it("submits manual subtask and resets form", async () => {
    const onAddSubtask = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useTaskCardForms({ taskId: "t1", onAddSubtask }),
    );

    act(() => {
      result.current.setSubtaskTitle("Draft outline");
    });

    await act(async () => {
      await result.current.handleAddSubtask({
        preventDefault: vi.fn(),
      } as unknown as React.FormEvent);
    });

    expect(onAddSubtask).toHaveBeenCalledWith("t1", "Draft outline");
    expect(result.current.subtaskTitle).toBe("");
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
