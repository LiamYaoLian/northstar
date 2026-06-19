import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("email_verified", { mode: "timestamp_ms" }),
  image: text("image"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

export const accounts = sqliteTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
    index("idx_accounts_user_id").on(table.userId),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("idx_sessions_user_id").on(table.userId)],
);

export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

export const northStars = sqliteTable(
  "north_stars",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    statement: text("statement").notNull(),
    horizon: text("horizon").notNull(),
    hoursPerWeek: integer("hours_per_week").notNull().default(40),
    workPrimaryTrack: text("work_primary_track"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("idx_north_stars_user_id").on(table.userId)],
);

export const strategicPillars = sqliteTable(
  "strategic_pillars",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
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
  },
  (table) => [index("idx_pillars_user_sort").on(table.userId, table.sortOrder)],
);

export const strategyRevisions = sqliteTable(
  "strategy_revisions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    northStarStatement: text("north_star_statement").notNull(),
    horizon: text("horizon").notNull(),
    pillars: text("pillars").notNull(), // JSON snapshot
    effectiveFrom: text("effective_from").notNull(),
    source: text("source").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_strategy_revisions_user_created").on(table.userId, table.createdAt)],
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    pillarId: text("pillar_id").notNull(),
    name: text("name").notNull(),
    focusTrack: text("focus_track"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("active"), // active | archived
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_projects_user_pillar_status").on(
      table.userId,
      table.pillarId,
      table.status,
    ),
  ],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    pillarId: text("pillar_id"),
    focusTrack: text("focus_track"),
    projectId: text("project_id"),
    status: text("status").notNull().default("todo"), // todo | in_progress | done
    intimidationScore: integer("intimidation_score").notNull().default(1),
    priorityScore: real("priority_score").notNull().default(0),
    priorityFactors: text("priority_factors"), // JSON
    priorityComputedAt: text("priority_computed_at"),
    estimatedMin: integer("estimated_min"),
    startAt: text("start_at"),
    dueAt: text("due_at"),
    manualSortOrder: integer("manual_sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    completedAt: text("completed_at"),
    recurrenceType: text("recurrence_type").notNull().default("none"),
    recurrenceDays: text("recurrence_days"),
    recurrenceCarryOver: integer("recurrence_carry_over", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (table) => [
    index("idx_tasks_user_status").on(table.userId, table.status),
    index("idx_tasks_user_manual_sort").on(table.userId, table.manualSortOrder),
  ],
);

export const subtasks = sqliteTable(
  "subtasks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    parentTaskId: text("parent_task_id").notNull(),
    title: text("title").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isDone: integer("is_done", { mode: "boolean" }).notNull().default(false),
    estimatedMin: integer("estimated_min"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_subtasks_user_parent").on(table.userId, table.parentTaskId)],
);

export const timeEntries = sqliteTable(
  "time_entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    taskId: text("task_id").notNull(),
    startedAt: text("started_at").notNull(),
    durationMin: integer("duration_min").notNull(),
    source: text("source").notNull().default("manual"), // manual | timer
    note: text("note"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_time_entries_user_started_at").on(table.userId, table.startedAt)],
);

export const activeTimeSessions = sqliteTable(
  "active_time_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskId: text("task_id").notNull(),
    mode: text("mode").notNull(), // stopwatch | pomodoro
    startedAt: text("started_at").notNull(),
    targetDurationMin: integer("target_duration_min"),
    note: text("note"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("idx_active_time_sessions_user").on(table.userId)],
);

export const taskCompletionEvents = sqliteTable(
  "task_completion_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    taskId: text("task_id").notNull(),
    completedAt: text("completed_at").notNull(),
    occurrenceDate: text("occurrence_date").notNull(),
    taskTitle: text("task_title").notNull(),
    pillarId: text("pillar_id"),
    pillarName: text("pillar_name"),
    pillarColor: text("pillar_color"),
    focusTrack: text("focus_track"),
    recurrenceType: text("recurrence_type").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_completion_events_user_occurrence").on(
      table.userId,
      table.occurrenceDate,
    ),
    uniqueIndex("idx_completion_events_user_task_completed").on(
      table.userId,
      table.taskId,
      table.completedAt,
    ),
  ],
);

export const reviewSnapshots = sqliteTable(
  "review_snapshots",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    periodStart: text("period_start").notNull(),
    periodEnd: text("period_end").notNull(),
    plannedPct: text("planned_pct").notNull(), // JSON
    actualPct: text("actual_pct").notNull(), // JSON
    driftScore: real("drift_score").notNull(),
    alignmentScore: real("alignment_score").notNull(),
    aiSummary: text("ai_summary"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_review_snapshots_user_period").on(
      table.userId,
      table.periodStart,
      table.periodEnd,
    ),
  ],
);

export type NorthStar = typeof northStars.$inferSelect;
export type User = typeof users.$inferSelect;
export type StrategicPillar = typeof strategicPillars.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type ActiveTimeSession = typeof activeTimeSessions.$inferSelect;
export type Subtask = typeof subtasks.$inferSelect;
export type TaskCompletionEventRow = typeof taskCompletionEvents.$inferSelect;

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
