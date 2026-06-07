import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const northStars = sqliteTable("north_stars", {
  id: text("id").primaryKey(),
  statement: text("statement").notNull(),
  horizon: text("horizon").notNull(),
  hoursPerWeek: integer("hours_per_week").notNull().default(40),
  workPrimaryTrack: text("work_primary_track"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const strategicPillars = sqliteTable("strategic_pillars", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  targetPct: real("target_pct").notNull(),
  color: text("color").notNull(),
  keywords: text("keywords").notNull(), // JSON string[]
  focusTracks: text("focus_tracks"), // JSON FocusTrack[]
  floorMinPerWeek: integer("floor_min_per_week"),
  capMaxPct: real("cap_max_pct"),
  isHardConstraint: integer("is_hard_constraint", { mode: "boolean" })
    .notNull()
    .default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const strategyRevisions = sqliteTable("strategy_revisions", {
  id: text("id").primaryKey(),
  northStarStatement: text("north_star_statement").notNull(),
  horizon: text("horizon").notNull(),
  pillars: text("pillars").notNull(), // JSON snapshot
  effectiveFrom: text("effective_from").notNull(),
  source: text("source").notNull(),
  createdAt: text("created_at").notNull(),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  pillarId: text("pillar_id"),
  focusTrack: text("focus_track"),
  status: text("status").notNull().default("todo"), // todo | in_progress | done | deferred
  intimidationScore: integer("intimidation_score").notNull().default(1),
  priorityScore: real("priority_score").notNull().default(0),
  priorityFactors: text("priority_factors"), // JSON
  priorityComputedAt: text("priority_computed_at"),
  estimatedMin: integer("estimated_min"),
  dueAt: text("due_at"),
  isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
  manualSortOrder: integer("manual_sort_order").notNull().default(0),
  postponedCount: integer("postponed_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  completedAt: text("completed_at"),
});

export const subtasks = sqliteTable("subtasks", {
  id: text("id").primaryKey(),
  parentTaskId: text("parent_task_id").notNull(),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isEntryPoint: integer("is_entry_point", { mode: "boolean" })
    .notNull()
    .default(false),
  isDone: integer("is_done", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const timeEntries = sqliteTable("time_entries", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  startedAt: text("started_at").notNull(),
  durationMin: integer("duration_min").notNull(),
  source: text("source").notNull().default("manual"), // manual | timer
  note: text("note"),
  createdAt: text("created_at").notNull(),
});

export const reviewSnapshots = sqliteTable("review_snapshots", {
  id: text("id").primaryKey(),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  plannedPct: text("planned_pct").notNull(), // JSON
  actualPct: text("actual_pct").notNull(), // JSON
  driftScore: real("drift_score").notNull(),
  alignmentScore: real("alignment_score").notNull(),
  aiSummary: text("ai_summary"),
  createdAt: text("created_at").notNull(),
});

export type NorthStar = typeof northStars.$inferSelect;
export type StrategicPillar = typeof strategicPillars.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type Subtask = typeof subtasks.$inferSelect;

export type FocusTrack = {
  name: string;
  shareOfParent: number;
};

export type PriorityFactors = {
  strategicUrgency: number;
  deadlinePressure: number;
  intimidationEscalation: number;
  dependencyBlocker: number;
  staleness: number;
  recentlyDonePenalty: number;
};
