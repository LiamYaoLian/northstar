export const INIT_SQL = `
CREATE TABLE IF NOT EXISTS north_stars (
  id TEXT PRIMARY KEY,
  statement TEXT NOT NULL,
  horizon TEXT NOT NULL,
  hours_per_week INTEGER NOT NULL DEFAULT 40,
  work_primary_track TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS strategic_pillars (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target_pct REAL NOT NULL,
  color TEXT NOT NULL,
  keywords TEXT NOT NULL,
  focus_tracks TEXT,
  floor_min_per_week INTEGER,
  cap_max_pct REAL,
  is_hard_constraint INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS strategy_revisions (
  id TEXT PRIMARY KEY,
  north_star_statement TEXT NOT NULL,
  horizon TEXT NOT NULL,
  pillars TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  pillar_id TEXT,
  focus_track TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  intimidation_score INTEGER NOT NULL DEFAULT 1,
  priority_score REAL NOT NULL DEFAULT 0,
  priority_factors TEXT,
  priority_computed_at TEXT,
  estimated_min INTEGER,
  due_at TEXT,
  manual_sort_order INTEGER NOT NULL DEFAULT 0,
  postponed_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  recurrence_type TEXT NOT NULL DEFAULT 'none',
  recurrence_days TEXT,
  recurrence_carry_over INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS subtasks (
  id TEXT PRIMARY KEY,
  parent_task_id TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review_snapshots (
  id TEXT PRIMARY KEY,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  planned_pct TEXT NOT NULL,
  actual_pct TEXT NOT NULL,
  drift_score REAL NOT NULL,
  alignment_score REAL NOT NULL,
  ai_summary TEXT,
  created_at TEXT NOT NULL
);
`;
