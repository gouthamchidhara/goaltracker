/**
 * Goal repository — all CRUD and query operations on goals + entries.
 * Uses expo-sqlite async API. All queries are parameterized.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type { Goal, Entry, StreakRecord, GoalType, Horizon, Category, EntryKind, Period, HealthMetric } from './types';

// ---------- Goal CRUD ----------

export async function insertGoal(db: SQLiteDatabase, goal: Goal): Promise<void> {
  await db.runAsync(
    `INSERT INTO goals (id, title, emoji, color, type, horizon, category, why, whyPhotoUri,
       startAt, deadline, targetValue, unit, period, parentId, pinnedToWidget, privateOnWidget,
       costPerDay, currency, minutesPerDay, healthMetric, pledgeEnabled, routineId,
       archivedAt, completedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      goal.id, goal.title, goal.emoji, goal.color, goal.type, goal.horizon, goal.category,
      goal.why, goal.whyPhotoUri ?? null, goal.startAt, goal.deadline ?? null,
      goal.targetValue ?? null, goal.unit ?? null, goal.period ?? null, goal.parentId ?? null,
      goal.pinnedToWidget ? 1 : 0, goal.privateOnWidget ? 1 : 0,
      goal.costPerDay ?? null, goal.currency ?? null, goal.minutesPerDay ?? null,
      goal.healthMetric ?? null, goal.pledgeEnabled ? 1 : 0, goal.routineId ?? null,
      goal.archivedAt ?? null, goal.completedAt ?? null, goal.createdAt, goal.updatedAt,
    ]
  );
}

export async function getGoal(db: SQLiteDatabase, id: string): Promise<Goal | null> {
  return db.getFirstAsync<Goal>('SELECT * FROM goals WHERE id = ?', [id]);
}

export async function listGoals(db: SQLiteDatabase, includeArchived = false): Promise<Goal[]> {
  if (includeArchived) {
    return db.getAllAsync<Goal>('SELECT * FROM goals ORDER BY createdAt DESC');
  }
  return db.getAllAsync<Goal>('SELECT * FROM goals WHERE archivedAt IS NULL ORDER BY createdAt DESC');
}

export async function listPinnedGoals(db: SQLiteDatabase): Promise<Goal[]> {
  return db.getAllAsync<Goal>(
    'SELECT * FROM goals WHERE pinnedToWidget = 1 AND archivedAt IS NULL ORDER BY createdAt DESC'
  );
}

export async function updateGoal(db: SQLiteDatabase, id: string, updates: Partial<Goal>): Promise<void> {
  const keys = Object.keys(updates).filter(k => k !== 'id');
  if (keys.length === 0) return;
  const sets = keys.map(k => `${k} = ?`).join(', ');
  const values = keys.map(k => {
    const v = (updates as Record<string, unknown>)[k];
    return typeof v === 'boolean' ? (v ? 1 : 0) : v ?? null;
  });
  values.push(new Date().toISOString(), id);
  await db.runAsync(`UPDATE goals SET ${sets}, updatedAt = ? WHERE id = ?`, values as any[]);
}

export async function archiveGoal(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    "UPDATE goals SET archivedAt = ?, updatedAt = ? WHERE id = ?",
    [new Date().toISOString(), new Date().toISOString(), id]
  );
}

export async function deleteGoal(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM entries WHERE goalId = ?', [id]);
  await db.runAsync('DELETE FROM streak_records WHERE goalId = ?', [id]);
  await db.runAsync('DELETE FROM goals WHERE id = ?', [id]);
}

// ---------- Entries ----------

export async function insertEntry(db: SQLiteDatabase, entry: Entry): Promise<void> {
  await db.runAsync(
    `INSERT INTO entries (id, goalId, kind, value, note, mood, triggers, durationSec, at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id, entry.goalId, entry.kind, entry.value ?? null, entry.note ?? null,
      entry.mood ?? null, entry.triggers ? JSON.stringify(entry.triggers) : null,
      entry.durationSec ?? null, entry.at,
    ]
  );
}

export async function listEntries(db: SQLiteDatabase, goalId: string): Promise<Entry[]> {
  const rows = await db.getAllAsync<Entry & { triggers: string | null }>(
    'SELECT * FROM entries WHERE goalId = ? ORDER BY at ASC',
    [goalId]
  );
  return rows.map(r => ({
    ...r,
    triggers: r.triggers ? JSON.parse(r.triggers) : undefined,
  }));
}

export async function listEntriesToday(db: SQLiteDatabase, goalId: string, dayStartISO: string): Promise<Entry[]> {
  const rows = await db.getAllAsync<Entry & { triggers: string | null }>(
    'SELECT * FROM entries WHERE goalId = ? AND at >= ? ORDER BY at ASC',
    [goalId, dayStartISO]
  );
  return rows.map(r => ({
    ...r,
    triggers: r.triggers ? JSON.parse(r.triggers) : undefined,
  }));
}

export async function listAllEntries(db: SQLiteDatabase): Promise<Entry[]> {
  return db.getAllAsync<Entry>('SELECT * FROM entries ORDER BY at ASC');
}

// ---------- Streak records ----------

export async function insertStreakRecord(db: SQLiteDatabase, rec: StreakRecord): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO streak_records (goalId, startAt, endAt, lengthDays) VALUES (?, ?, ?, ?)',
    [rec.goalId, rec.startAt, rec.endAt, rec.lengthDays]
  );
}

export async function listStreakRecords(db: SQLiteDatabase, goalId: string): Promise<StreakRecord[]> {
  return db.getAllAsync<StreakRecord>(
    'SELECT * FROM streak_records WHERE goalId = ? ORDER BY endAt DESC',
    [goalId]
  );
}

// ---------- Meta ----------

export async function setMeta(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [key, value]);
}

export async function getMeta(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]);
  return row?.value ?? null;
}