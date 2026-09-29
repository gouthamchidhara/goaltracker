/**
 * SQLite schema + migration runner for expo-sqlite.
 * Single migration for now; schema is versioned via PRAGMA user_version.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export const MIGRATION_V1 = `
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#8B7CFF',
  type TEXT NOT NULL CHECK(type IN ('countdown','streak','quit','target','habit','milestone')),
  horizon TEXT NOT NULL DEFAULT 'short' CHECK(horizon IN ('short','long')),
  category TEXT NOT NULL DEFAULT 'custom' CHECK(category IN ('education','health','fitness','finance','career','recovery','personal','custom')),
  why TEXT NOT NULL DEFAULT '',
  whyPhotoUri TEXT,
  startAt TEXT NOT NULL,
  deadline TEXT,
  targetValue REAL,
  unit TEXT,
  period TEXT CHECK(period IN ('day','week','month')),
  parentId TEXT,
  pinnedToWidget INTEGER NOT NULL DEFAULT 0,
  privateOnWidget INTEGER NOT NULL DEFAULT 0,
  costPerDay REAL,
  currency TEXT,
  minutesPerDay REAL,
  healthMetric TEXT CHECK(healthMetric IN ('steps','workouts','mindful_minutes','sleep_hours','water_ml')),
  pledgeEnabled INTEGER NOT NULL DEFAULT 0,
  routineId TEXT,
  archivedAt TEXT,
  completedAt TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_goals_parent ON goals(parentId);
CREATE INDEX IF NOT EXISTS idx_goals_type ON goals(type);
CREATE INDEX IF NOT EXISTS idx_goals_archived ON goals(archivedAt);

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY NOT NULL,
  goalId TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('checkin','miss','increment','slip','note','pledge','review','urge_resisted','auto','focus_session')),
  value REAL,
  note TEXT,
  mood INTEGER CHECK(mood BETWEEN 1 AND 5),
  triggers TEXT,          -- JSON array of trigger strings
  durationSec INTEGER,
  at TEXT NOT NULL,
  FOREIGN KEY (goalId) REFERENCES goals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entries_goal ON entries(goalId);
CREATE INDEX IF NOT EXISTS idx_entries_goal_at ON entries(goalId, at);
CREATE INDEX IF NOT EXISTS idx_entries_kind ON entries(kind);

CREATE TABLE IF NOT EXISTS streak_records (
  goalId TEXT NOT NULL,
  startAt TEXT NOT NULL,
  endAt TEXT NOT NULL,
  lengthDays INTEGER NOT NULL,
  PRIMARY KEY (goalId, startAt),
  FOREIGN KEY (goalId) REFERENCES goals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  steps TEXT NOT NULL,    -- JSON array of RoutineStep
  scheduledTime TEXT
);

CREATE TABLE IF NOT EXISTS focus_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  goalId TEXT NOT NULL,
  plannedSec INTEGER NOT NULL DEFAULT 1500,
  startedAt TEXT NOT NULL,
  pausedAt TEXT,
  accumulatedPauseSec INTEGER NOT NULL DEFAULT 0,
  endedAt TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (goalId) REFERENCES goals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

/** Run migrations on the database. Call once at startup. */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(MIGRATION_V1);
    await db.execAsync('PRAGMA user_version = 1');
  }
  // Future: if (version < 2) { ... }
}