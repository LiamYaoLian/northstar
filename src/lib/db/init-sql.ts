export const INIT_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  email_verified INTEGER,
  image TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS accounts (
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  PRIMARY KEY (provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  session_token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires INTEGER NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE TABLE IF NOT EXISTS north_stars (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  statement TEXT NOT NULL,
  horizon TEXT NOT NULL,
  hours_per_week INTEGER NOT NULL DEFAULT 40,
  work_primary_track TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS strategic_pillars (
  id TEXT PRIMARY KEY,
  user_id TEXT,
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
  user_id TEXT,
  north_star_statement TEXT NOT NULL,
  horizon TEXT NOT NULL,
  pillars TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT,
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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  recurrence_type TEXT NOT NULL DEFAULT 'none',
  recurrence_days TEXT,
  recurrence_carry_over INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS subtasks (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  parent_task_id TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  task_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS active_time_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  started_at TEXT NOT NULL,
  target_duration_min INTEGER,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_completion_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  task_id TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  occurrence_date TEXT NOT NULL,
  task_title TEXT NOT NULL,
  pillar_id TEXT,
  pillar_name TEXT,
  pillar_color TEXT,
  focus_track TEXT,
  recurrence_type TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS review_snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  planned_pct TEXT NOT NULL,
  actual_pct TEXT NOT NULL,
  drift_score REAL NOT NULL,
  alignment_score REAL NOT NULL,
  ai_summary TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_north_stars_user_id ON north_stars (user_id);
CREATE INDEX IF NOT EXISTS idx_pillars_user_sort ON strategic_pillars (user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_strategy_revisions_user_created ON strategy_revisions (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks (user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_manual_sort ON tasks (user_id, manual_sort_order);
CREATE INDEX IF NOT EXISTS idx_subtasks_user_parent ON subtasks (user_id, parent_task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_started_at ON time_entries (user_id, started_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_time_sessions_user ON active_time_sessions (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_completion_events_user_task_completed ON task_completion_events (user_id, task_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_completion_events_user_occurrence ON task_completion_events (user_id, occurrence_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_snapshots_user_period ON review_snapshots (user_id, period_start, period_end);
`;
