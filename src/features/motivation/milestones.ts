/**
 * Milestone detection and celebration triggers.
 * Auto milestones per §5.2 #2.
 */

import type { Goal, Entry, DerivedGoalStats } from '@/db/types';
import { STREAK_MILESTONES, TARGET_MILESTONES_PCT } from '@/features/goals/derived';

export interface Milestone {
  id: string;
  goalId: string;
  label: string;
  value: number;
  unlocked: boolean;
  unlockedAt?: string;
}

/** Get all milestone thresholds for a goal */
export function getMilestones(goal: Goal): { value: number; label: string }[] {
  if (goal.type === 'streak' || goal.type === 'quit') {
    return STREAK_MILESTONES.map(m => ({ value: m, label: `Day ${m}` }));
  }
  if (goal.type === 'target' || goal.type === 'milestone') {
    return TARGET_MILESTONES_PCT.map(p => ({
      value: p / 100,
      label: `${p}%`,
    }));
  }
  if (goal.type === 'habit') {
    return STREAK_MILESTONES.map(m => ({ value: m, label: `${m} in a row` }));
  }
  return [];
}

/** Detect milestones that were just reached by this check-in */
export function detectNewMilestones(
  goal: Goal,
  stats: DerivedGoalStats,
  previousStats: DerivedGoalStats | undefined
): Milestone[] {
  const milestones = getMilestones(goal);
  const prev = previousStats?.progressPct ?? 0;

  return milestones
    .filter(m => {
      const prevReached = prev >= m.value;
      const nowReached = stats.progressPct >= m.value;
      return nowReached && !prevReached;
    })
    .map(m => ({
      id: `${goal.id}_${m.value}`,
      goalId: goal.id,
      label: m.label,
      value: m.value,
      unlocked: true,
      unlockedAt: new Date().toISOString(),
    }));
}

/** Check if a specific streak milestone was reached */
export function isStreakMilestoneReached(streakDays: number, milestone: number): boolean {
  return streakDays >= milestone;
}

/** Get the next streak milestone */
export function getNextStreakMilestone(currentStreak: number): number | null {
  return STREAK_MILESTONES.find(m => m > currentStreak) ?? null;
}

/** Get progress to next milestone (0..1) */
export function getProgressToNextMilestone(currentStreak: number): number {
  const next = getNextStreakMilestone(currentStreak);
  if (!next) return 1;
  const prevMilestone = [...STREAK_MILESTONES].reverse().find(m => m <= currentStreak) ?? 0;
  const range = next - prevMilestone;
  return range > 0 ? (currentStreak - prevMilestone) / range : 1;
}