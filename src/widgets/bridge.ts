/**
 * Widget snapshot bridge stub.
 * Phase 2: writes compact JSON snapshot to App Group (iOS) / SharedPreferences (Android).
 * For now, exports the type and a local-only writer.
 */

import type { Goal, Entry, StreakRecord, DerivedGoalStats } from '@/db/types';

export interface WidgetGoalSnapshot {
  id: string;
  title: string;
  emoji: string;
  color: string;
  type: string;
  startAt: string;
  primaryValue: number;
  primaryLabel: string;
  progressPct: number;
  nextMilestone: number | null;
  secondaryText: string;
  doneToday: boolean;
  private: boolean;
  quote: string;
  strength: number;
  savedText: string;
  pledgedToday: boolean;
  icon: string;
  unitShort: string;
  actionLabel: string;
  grid12w: string;
}

export interface WidgetSnapshot {
  version: number;
  generatedAt: string;
  theme: 'dark' | 'light';
  goals: WidgetGoalSnapshot[];
  summary: { doneToday: number; dueToday: number };
  focus: {
    goalId: string;
    title: string;
    endsAt: string;
    paused: boolean;
    sessionIndex: number;
    sessionTarget: number;
  } | null;
}

/** Build the widget snapshot from goals + derived stats. */
export function buildWidgetSnapshot(
  goals: Goal[],
  entriesMap: Record<string, Entry[]>,
  statsMap: Record<string, DerivedGoalStats>,
  focus: WidgetSnapshot['focus'] = null
): WidgetSnapshot {
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);

  const snapshotGoals: WidgetGoalSnapshot[] = goals
    .filter(g => !g.archivedAt && g.pinnedToWidget)
    .map(g => {
      const stats = statsMap[g.id];
      const entries = entriesMap[g.id] ?? [];
      const doneToday = entries.some(e => e.at.slice(0, 10) === todayKey && e.kind !== 'miss' && e.kind !== 'slip');

      return {
        id: g.id,
        title: g.title,
        emoji: g.emoji,
        color: g.color,
        type: g.type,
        startAt: g.startAt,
        primaryValue: stats?.currentStreak ?? 0,
        primaryLabel: g.type === 'quit' || g.type === 'streak' ? 'days' : g.unit ?? '',
        progressPct: stats?.progressPct ?? 0,
        nextMilestone: null,
        secondaryText: '',
        doneToday,
        private: g.privateOnWidget,
        quote: g.why,
        strength: stats?.strengthScore ?? 0,
        savedText: stats?.moneySaved ? `$${Math.floor(stats.moneySaved)} saved` : '',
        pledgedToday: false,
        icon: g.type,
        unitShort: g.type === 'quit' || g.type === 'streak' ? 'DAYS' : (g.unit ?? '').slice(0, 4).toUpperCase(),
        actionLabel: g.type === 'quit' ? 'Pledge' : g.type === 'habit' ? 'Check in' : '+1',
        grid12w: '',
      };
    });

  return {
    version: 1,
    generatedAt: now.toISOString(),
    theme: 'dark',
    goals: snapshotGoals,
    summary: {
      doneToday: snapshotGoals.filter(g => g.doneToday).length,
      dueToday: snapshotGoals.length,
    },
    focus,
  };
}

/**
 * TODO(Phase 2): Write snapshot to native widget store.
 * iOS: UserDefaults(suiteName: 'group.TODO(owner).northstar')
 * Android: SharedPreferences
 * Then trigger WidgetCenter.shared.reloadAllTimelines() / AppWidgetManager.updateAppWidget()
 */
export async function writeWidgetSnapshot(_snapshot: WidgetSnapshot): Promise<void> {
  // Stub — Phase 2 native module bridge
}