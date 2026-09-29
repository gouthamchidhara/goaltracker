/**
 * Derived goal statistics — all computed, never stored.
 * Pure functions, fully unit-testable.
 * See §3.2 "Derived values" in the build spec.
 */

import type { Goal, Entry, StreakRecord, DerivedGoalStats } from '@/db/types';
import { daysSince, diffCalendarDays, startOfToday, startOfDay, isToday, parseISO } from '@/lib/dates';

// ---- Progress ----

/** Returns progressPct 0..1 */
export function calcProgressPct(goal: Goal, entries: Entry[], now: Date = new Date()): number {
  const start = parseISO(goal.startAt);

  switch (goal.type) {
    case 'countdown': {
      if (!goal.deadline) return 0;
      const deadline = parseISO(goal.deadline);
      const total = deadline.getTime() - start.getTime();
      if (total <= 0) return 1;
      const elapsed = now.getTime() - start.getTime();
      return clamp01(elapsed / total);
    }
    case 'streak': {
      // Progress to next milestone (1,3,7,14,30,60,90,180,365)
      const streak = calcCurrentStreak(goal, entries, now);
      const milestones = STREAK_MILESTONES;
      const next = milestones.find(m => m > streak);
      return next ? clamp01(streak / next) : 1;
    }
    case 'quit': {
      // Same as streak: progress to next milestone
      const streak = calcCurrentStreak(goal, entries, now);
      const next = STREAK_MILESTONES.find(m => m > streak);
      return next ? clamp01(streak / next) : 1;
    }
    case 'target': {
      const total = sumIncrements(goal, entries);
      return goal.targetValue ? clamp01(total / goal.targetValue) : 0;
    }
    case 'habit': {
      const done = countPeriodCheckins(goal, entries, now);
      return goal.targetValue ? clamp01(done / goal.targetValue) : 0;
    }
    case 'milestone': {
      const done = countCompletedSubGoals(goal, entries);
      return goal.targetValue ? clamp01(done / goal.targetValue) : 0;
    }
  }
}

// ---- Streaks ----

/** Current consecutive-day streak of "done" days without a miss/slip. */
export function calcCurrentStreak(goal: Goal, entries: Entry[], now: Date = new Date()): number {
  const start = startOfDay(parseISO(goal.startAt));
  const today = startOfToday(now);

  // Build set of "done" and "miss/slip" day keys
  const doneDays = new Set<string>();
  const missDays = new Set<string>();
  const dayFmt = (d: Date) => d.toISOString().slice(0, 10);

  for (const e of entries) {
    const d = new Date(e.at);
    const key = dayFmt(d);
    if (e.kind === 'checkin' || e.kind === 'increment' || e.kind === 'urge_resisted' || e.kind === 'focus_session') {
      doneDays.add(key);
    } else if (e.kind === 'miss' || e.kind === 'slip') {
      missDays.add(key);
    }
  }

  // Walk backwards from today
  let streak = 0;
  let cursor = new Date(today);

  for (;;) {
    const key = dayFmt(cursor);
    if (missDays.has(key)) break; // streak is broken by miss/slip
    if (doneDays.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      // Not yet done today — don't break, just stop counting backwards
      // But if it's not today and there's no entry, stop
      if (!isToday(cursor.toISOString(), now)) break;
      // Today with no entry: streak can still carry over from yesterday
      cursor.setDate(cursor.getDate() - 1);
    }
    if (cursor < start) break;
  }

  return streak;
}

/** Best streak ever, including closed streak records. */
export function calcBestStreak(
  goal: Goal,
  entries: Entry[],
  streakRecords: StreakRecord[],
  now: Date = new Date()
): number {
  const current = calcCurrentStreak(goal, entries, now);
  const historical = streakRecords.reduce((max, r) => Math.max(max, r.lengthDays), 0);
  return Math.max(current, historical);
}

/** Total clean days = all days with a positive entry (checkin, increment, urge_resisted, focus_session) */
export function calcTotalCleanDays(goal: Goal, entries: Entry[]): number {
  const doneDays = new Set<string>();
  for (const e of entries) {
    if (e.kind === 'checkin' || e.kind === 'increment' || e.kind === 'urge_resisted' || e.kind === 'focus_session') {
      doneDays.add(e.at.slice(0, 10));
    }
  }
  return doneDays.size;
}

// ---- Deadline / pace ----

export function calcDaysLeft(goal: Goal, now: Date = new Date()): number | null {
  if (!goal.deadline) return null;
  return diffCalendarDays(parseISO(goal.deadline), now);
}

export function calcPaceStatus(goal: Goal, entries: Entry[], now: Date = new Date()): 'ahead' | 'on_track' | 'behind' | null {
  if (!goal.deadline || !goal.targetValue) return null;

  const start = parseISO(goal.startAt);
  const deadline = parseISO(goal.deadline);
  const totalDays = diffCalendarDays(deadline, start);
  if (totalDays <= 0) return null;

  const elapsed = diffCalendarDays(now, start);
  const expectedPct = clamp01(elapsed / totalDays);

  // For habit/target types, progress = accumulated value / target
  let actualPct: number;
  if (goal.type === 'target') {
    actualPct = goal.targetValue ? sumIncrements(goal, entries) / goal.targetValue : 0;
  } else if (goal.type === 'habit') {
    actualPct = calcProgressPct(goal, entries, now);
  } else {
    // countdown: progress is time-based
    actualPct = expectedPct;
    return 'on_track';
  }

  const diff = actualPct - expectedPct;
  if (diff > 0.05) return 'ahead';
  if (diff < -0.05) return 'behind';
  return 'on_track';
}

// ---- Strength score (§5.2 #1) ----

/** Half-life for EMA decay. Default 14 days for daily goals. */
const DEFAULT_HALF_LIFE_DAYS = 14;

/**
 * Exponential moving average of daily completion.
 * score = score * decay + (done ? 1 : 0) * (1 - decay)
 * Decay derived from half-life. Miss always counts as miss.
 */
export function calcStrengthScore(goal: Goal, entries: Entry[], now: Date = new Date()): number {
  const halfLife = DEFAULT_HALF_LIFE_DAYS;
  const decay = Math.pow(0.5, 1 / halfLife); // ~0.951 for 14-day half-life

  const doneDays = new Set<string>();
  const missDays = new Set<string>();

  for (const e of entries) {
    const key = e.at.slice(0, 10);
    if (e.kind === 'checkin' || e.kind === 'increment' || e.kind === 'urge_resisted' || e.kind === 'focus_session') {
      doneDays.add(key);
    } else if (e.kind === 'miss' || e.kind === 'slip') {
      missDays.add(key);
    }
  }

  const start = startOfDay(parseISO(goal.startAt));
  const today = startOfToday(now);
  let score = 0.5; // neutral start (0..1)

  // Walk day by day from start to today
  const cursor = new Date(start);
  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    const done = doneDays.has(key);
    const missed = missDays.has(key);
    // done = 1, miss or no entry = 0
    const val = done ? 1 : 0;
    score = score * decay + val * (1 - decay);
    cursor.setDate(cursor.getDate() + 1);
  }

  return Math.round(clamp01(score) * 100);
}

// ---- Savings (quit goals) ----

export function calcMoneySaved(goal: Goal, now: Date = new Date()): number {
  if (goal.type !== 'quit' || !goal.costPerDay) return 0;
  const days = daysSince(goal.startAt, now);
  return goal.costPerDay * days;
}

export function calcTimeSavedMinutes(goal: Goal, now: Date = new Date()): number {
  if (goal.type !== 'quit' || !goal.minutesPerDay) return 0;
  const days = daysSince(goal.startAt, now);
  return goal.minutesPerDay * days;
}

// ---- Convenience: all stats at once ----

export function computeAllStats(
  goal: Goal,
  entries: Entry[],
  streakRecords: StreakRecord[] = [],
  now: Date = new Date()
): DerivedGoalStats {
  return {
    progressPct: calcProgressPct(goal, entries, now),
    currentStreak: calcCurrentStreak(goal, entries, now),
    bestStreak: calcBestStreak(goal, entries, streakRecords, now),
    totalCleanDays: calcTotalCleanDays(goal, entries),
    daysLeft: calcDaysLeft(goal, now),
    paceStatus: calcPaceStatus(goal, entries, now),
    projectedCompletionDate: null,
    strengthScore: calcStrengthScore(goal, entries, now),
    moneySaved: calcMoneySaved(goal, now),
    timeSavedMinutes: calcTimeSavedMinutes(goal, now),
  };
}

// ---- Helpers ----

export const STREAK_MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365] as const;
export const TARGET_MILESTONES_PCT = [10, 25, 50, 75, 100] as const;

function sumIncrements(goal: Goal, entries: Entry[]): number {
  return entries
    .filter(e => e.kind === 'increment' && e.value != null)
    .reduce((sum, e) => sum + (e.value ?? 0), 0);
}

function countPeriodCheckins(goal: Goal, entries: Entry[], now: Date): number {
  const period = goal.period ?? 'day';
  const { start, end } = periodRange(period, now);
  return entries.filter(e => {
    const d = new Date(e.at);
    return d >= start && d <= end && (e.kind === 'checkin' || e.kind === 'increment');
  }).length;
}

function countCompletedSubGoals(goal: Goal, entries: Entry[]): number {
  // Count distinct sub-goals with checkins (simplified — full impl needs sub-goal list)
  return entries.filter(e => e.kind === 'checkin').length;
}

function periodRange(period: 'day' | 'week' | 'month', now: Date): { start: Date; end: Date } {
  const start = startOfToday(now);
  const end = new Date(start);
  switch (period) {
    case 'day':
      end.setHours(23, 59, 59, 999);
      break;
    case 'week': {
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'month':
      start.setDate(1);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
  }
  return { start, end };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}