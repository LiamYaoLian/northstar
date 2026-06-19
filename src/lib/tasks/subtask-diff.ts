import type { Subtask } from "@/lib/db/schema";
import type { BreakdownItem } from "@/lib/ai/breakdown";

export type ProposedSubtask = {
  title: string;
  existingId?: string;
  estimatedMin?: number;
};

export type BreakdownPreviewResult = {
  preview: true;
  diff: SubtaskDiffLine[];
  proposed: ProposedSubtask[];
  summary?: string;
  source: "openai" | "rules";
  noChanges?: boolean;
  estimatedMinTotal?: number;
};

export type SubtaskDiffLine =
  | { type: "unchanged"; id: string; title: string; isDone: boolean; estimatedMin?: number }
  | { type: "removed"; id: string; title: string; isDone: boolean; estimatedMin?: number }
  | { type: "added"; title: string; estimatedMin?: number }
  | { type: "renamed"; id: string; from: string; to: string; isDone: boolean; estimatedMin?: number };

export function resolveProposedSubtasks(
  existing: Pick<Subtask, "id" | "title">[],
  items: BreakdownItem[],
): ProposedSubtask[] {
  const usedIds = new Set<string>();

  return items.map((item) => {
    const title = item.title.trim();
    const match = existing.find(
      (subtask) => !usedIds.has(subtask.id) && subtask.title === title,
    );
    if (match) {
      usedIds.add(match.id);
      return { title, existingId: match.id, estimatedMin: item.estimatedMin };
    }
    return { title, estimatedMin: item.estimatedMin };
  });
}

export function hasSubtaskDiffChanges(diff: SubtaskDiffLine[]): boolean {
  return diff.some((line) => line.type !== "unchanged");
}

export function computeSubtaskDiff(
  existing: Pick<Subtask, "id" | "title" | "isDone" | "sortOrder" | "estimatedMin">[],
  proposed: ProposedSubtask[],
): SubtaskDiffLine[] {
  const sortedExisting = [...existing].sort((a, b) => a.sortOrder - b.sortOrder);
  const existingTitles = sortedExisting.map((subtask) => subtask.title);
  const proposedTitles = proposed.map((item) => item.title);
  const ops = diffTitleSequences(existingTitles, proposedTitles);

  const lines: SubtaskDiffLine[] = [];
  let existingIndex = 0;
  let proposedIndex = 0;

  for (const op of ops) {
    if (op === "equal") {
      const current = sortedExisting[existingIndex];
      lines.push({
        type: "unchanged",
        id: current.id,
        title: current.title,
        isDone: current.isDone,
        estimatedMin: proposed[proposedIndex]?.estimatedMin ?? current.estimatedMin ?? undefined,
      });
      existingIndex += 1;
      proposedIndex += 1;
      continue;
    }

    if (op === "delete") {
      const current = sortedExisting[existingIndex];
      lines.push({
        type: "removed",
        id: current.id,
        title: current.title,
        isDone: current.isDone,
        estimatedMin: current.estimatedMin ?? undefined,
      });
      existingIndex += 1;
      continue;
    }

    lines.push({
      type: "added",
      title: proposed[proposedIndex].title,
      estimatedMin: proposed[proposedIndex].estimatedMin,
    });
    proposedIndex += 1;
  }

  return lines;
}

type DiffOp = "equal" | "delete" | "insert";

function diffTitleSequences(existing: string[], proposed: string[]): DiffOp[] {
  const m = existing.length;
  const n = proposed.length;
  const dp = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (existing[i - 1] === proposed[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const ops: DiffOp[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (existing[i - 1] === proposed[j - 1]) {
      ops.push("equal");
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      ops.push("delete");
      i -= 1;
    } else {
      ops.push("insert");
      j -= 1;
    }
  }

  while (i > 0) {
    ops.push("delete");
    i -= 1;
  }

  while (j > 0) {
    ops.push("insert");
    j -= 1;
  }

  return ops.reverse();
}
