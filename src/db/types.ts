/**
 * TypeScript data model — matches §3.2 of build spec.
 * All types used throughout the app.
 */

export type GoalType = 'countdown' | 'streak' | 'quit' | 'target' | 'habit' | 'milestone';
export type Horizon = 'short' | 'long'; // short ≤ 90 days, long > 90 days
export type Category = 'education' | 'health' | 'fitness' | 'finance' | 'career' | 'recovery' | 'personal' | 'custom';

export type EntryKind =
  | 'checkin'
  | 'miss'
  | 'increment'
  | 'slip'
  | 'note'
  | 'pledge'
  | 'review'
  | 'urge_resisted'
  | 'auto'
  | 'focus_session';

export type Period = 'day' | 'week' | 'month';

export type HealthMetric =
  | 'steps'
  | 'workouts'
  | 'mindful_minutes'
  | 'sleep_hours'
  | 'water_ml';

export interface Goal {
  id: string;
  title: string;
  emoji: string;
  color: string;          // hex accent
  type: GoalType;
  horizon: Horizon;
  category: Category;
  why: string;
  whyPhotoUri?: string;
  startAt: string;        // ISO
  deadline?: string;      // ISO (countdown / target / milestone)
  targetValue?: number;   // target / habit
  unit?: string;          // "books", "$", "km", "hrs"
  period?: Period;        // habit
  parentId?: string;      // sub-goal of a milestone
  pinnedToWidget: boolean;
  privateOnWidget: boolean;
  costPerDay?: number;    // quit: money saved calc
  currency?: string;      // ISO 4217
  minutesPerDay?: number; // quit: time saved calc
  healthMetric?: HealthMetric;
  pledgeEnabled: boolean;
  routineId?: string;
  archivedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Entry {
  id: string;
  goalId: string;
  kind: EntryKind;
  value?: number;
  note?: string;
  mood?: 1 | 2 | 3 | 4 | 5;
  triggers?: string[];
  durationSec?: number;
  at: string;             // ISO
}

export interface StreakRecord {
  goalId: string;
  startAt: string;
  endAt: string;
  lengthDays: number;
}

export interface RoutineStep {
  id: string;
  label: string;
  emoji: string;
  durationSec: number;
  goalId?: string;
}

export interface Routine {
  id: string;
  title: string;
  steps: RoutineStep[];
  scheduledTime?: string; // "07:00"
}

export interface FocusSession {
  id: string;
  goalId: string;
  plannedSec: number;
  startedAt: string;
  pausedAt?: string;
  accumulatedPauseSec: number;
  endedAt?: string;
  completed: boolean;
}

export interface Buddy {
  id: string;
  displayName: string;
  sharedGoalIds: string[];
  inviteCode: string;
}

/** Derived values — computed, never stored */
export interface DerivedGoalStats {
  progressPct: number;          // 0..1
  currentStreak: number;        // days
  bestStreak: number;           // days
  totalCleanDays: number;       // days (for quit: total since start)
  daysLeft: number | null;      // null if no deadline
  paceStatus: 'ahead' | 'on_track' | 'behind' | null;
  projectedCompletionDate: string | null; // ISO
  strengthScore: number;        // 0..100
  moneySaved: number;           // 0 if not quit
  timeSavedMinutes: number;     // 0 if not quit
}