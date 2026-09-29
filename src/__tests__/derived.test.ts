import {
  calcProgressPct,
  calcCurrentStreak,
  calcBestStreak,
  calcTotalCleanDays,
  calcDaysLeft,
  calcPaceStatus,
  calcStrengthScore,
  calcMoneySaved,
  calcTimeSavedMinutes,
  computeAllStats,
  STREAK_MILESTONES,
} from '@/features/goals/derived';
import {
  getNextStreakMilestone,
  getProgressToNextMilestone,
} from '@/features/motivation/milestones';
import type { Goal, Entry, StreakRecord } from '@/db/types';

const now = new Date('2026-06-15T14:00:00');

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    title: 'Test Goal',
    emoji: '🎯',
    color: '#8B7CFF',
    type: 'streak',
    horizon: 'short',
    category: 'personal',
    why: 'Because',
    startAt: '2026-06-01T08:00:00',
    pinnedToWidget: true,
    privateOnWidget: false,
    pledgeEnabled: false,
    createdAt: '2026-06-01T08:00:00',
    updatedAt: '2026-06-01T08:00:00',
    ...overrides,
  };
}

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: `e_${Math.random()}`,
    goalId: 'g1',
    kind: 'checkin',
    at: '2026-06-15T09:00:00',
    ...overrides,
  };
}

describe('derived calculations', () => {
  describe('calcProgressPct', () => {
    it('countdown: elapsed / total', () => {
      const goal = makeGoal({
        type: 'countdown',
        startAt: '2026-06-01T00:00:00',
        deadline: '2026-07-01T00:00:00',
      });
      // 15 days elapsed of 30 total
      const pct = calcProgressPct(goal, [], now);
      expect(pct).toBeCloseTo(0.5, 1);
    });

    it('target: sum increments / targetValue', () => {
      const goal = makeGoal({ type: 'target', targetValue: 20, unit: 'books' });
      const entries = [
        makeEntry({ kind: 'increment', value: 5 }),
        makeEntry({ kind: 'increment', value: 7 }),
      ];
      expect(calcProgressPct(goal, entries, now)).toBeCloseTo(0.6);
    });

    it('habit: checkins this period / targetValue', () => {
      // 2026-06-15 is Monday. Week = Mon 15 to Sun 21.
      // Only 06-15 is in this week. Others are prior week.
      const goal = makeGoal({ type: 'habit', targetValue: 5, period: 'week' });
      const entries = [
        makeEntry({ kind: 'checkin', at: '2026-06-15T09:00:00' }),
        makeEntry({ kind: 'checkin', at: '2026-06-16T09:00:00' }),
        makeEntry({ kind: 'checkin', at: '2026-06-17T09:00:00' }),
      ];
      expect(calcProgressPct(goal, entries, now)).toBeCloseTo(0.6);
    });
  });

  describe('calcCurrentStreak', () => {
    it('counts consecutive days', () => {
      const goal = makeGoal({ startAt: '2026-06-10T08:00:00' });
      const entries = [
        makeEntry({ kind: 'checkin', at: '2026-06-10T09:00:00' }),
        makeEntry({ kind: 'checkin', at: '2026-06-11T09:00:00' }),
        makeEntry({ kind: 'checkin', at: '2026-06-12T09:00:00' }),
        makeEntry({ kind: 'checkin', at: '2026-06-13T09:00:00' }),
        makeEntry({ kind: 'checkin', at: '2026-06-14T09:00:00' }),
      ];
      // today = 06-15, no entry today, but 5 consecutive before
      expect(calcCurrentStreak(goal, entries, now)).toBe(5);
    });

    it('miss breaks streak', () => {
      const goal = makeGoal({ startAt: '2026-06-10T08:00:00' });
      const entries = [
        makeEntry({ kind: 'checkin', at: '2026-06-10T09:00:00' }),
        makeEntry({ kind: 'checkin', at: '2026-06-11T09:00:00' }),
        makeEntry({ kind: 'miss', at: '2026-06-12T09:00:00' }),
        makeEntry({ kind: 'checkin', at: '2026-06-13T09:00:00' }),
        makeEntry({ kind: 'checkin', at: '2026-06-14T09:00:00' }),
      ];
      expect(calcCurrentStreak(goal, entries, now)).toBe(2);
    });

    it('slip resets streak', () => {
      const goal = makeGoal({ type: 'quit', startAt: '2026-06-10T08:00:00' });
      const entries = [
        makeEntry({ kind: 'checkin', at: '2026-06-10T09:00:00' }),
        makeEntry({ kind: 'checkin', at: '2026-06-11T09:00:00' }),
        makeEntry({ kind: 'slip', at: '2026-06-12T09:00:00' }),
        makeEntry({ kind: 'checkin', at: '2026-06-13T09:00:00' }),
        makeEntry({ kind: 'checkin', at: '2026-06-14T09:00:00' }),
      ];
      expect(calcCurrentStreak(goal, entries, now)).toBe(2);
    });

    it('no entries = streak 0', () => {
      const goal = makeGoal();
      expect(calcCurrentStreak(goal, [], now)).toBe(0);
    });
  });

  describe('calcBestStreak', () => {
    it('takes max of current and historical', () => {
      const goal = makeGoal({ startAt: '2026-06-01T08:00:00' });
      const entries = [
        makeEntry({ kind: 'checkin', at: '2026-06-14T09:00:00' }),
        makeEntry({ kind: 'checkin', at: '2026-06-15T09:00:00' }),
      ];
      const records: StreakRecord[] = [
        { goalId: 'g1', startAt: '2026-05-01T00:00:00', endAt: '2026-05-20T00:00:00', lengthDays: 19 },
      ];
      expect(calcBestStreak(goal, entries, records, now)).toBe(19);
    });
  });

  describe('calcTotalCleanDays', () => {
    it('counts unique done days', () => {
      const goal = makeGoal();
      const entries = [
        makeEntry({ kind: 'checkin', at: '2026-06-10T09:00:00' }),
        makeEntry({ kind: 'checkin', at: '2026-06-10T14:00:00' }), // same day
        makeEntry({ kind: 'checkin', at: '2026-06-11T09:00:00' }),
        makeEntry({ kind: 'checkin', at: '2026-06-12T09:00:00' }),
      ];
      expect(calcTotalCleanDays(goal, entries)).toBe(3);
    });
  });

  describe('calcDaysLeft', () => {
    it('returns days until deadline', () => {
      const goal = makeGoal({ deadline: '2026-06-25T23:59:59' });
      expect(calcDaysLeft(goal, now)).toBe(10);
    });

    it('null without deadline', () => {
      expect(calcDaysLeft(makeGoal(), now)).toBeNull();
    });
  });

  describe('calcPaceStatus', () => {
    it('on_track when pace matches', () => {
      const goal = makeGoal({
        type: 'target',
        targetValue: 100,
        startAt: '2026-06-01T00:00:00',
        deadline: '2026-07-01T00:00:00',
      });
      // 15 of 30 days elapsed = 50% expected
      // 50 of 100 target = 50% actual
      const entries = [makeEntry({ kind: 'increment', value: 50 })];
      expect(calcPaceStatus(goal, entries, now)).toBe('on_track');
    });

    it('ahead when above pace', () => {
      const goal = makeGoal({
        type: 'target',
        targetValue: 100,
        startAt: '2026-06-01T00:00:00',
        deadline: '2026-07-01T00:00:00',
      });
      // expected 50%, actual 70%
      const entries = [makeEntry({ kind: 'increment', value: 70 })];
      expect(calcPaceStatus(goal, entries, now)).toBe('ahead');
    });

    it('behind when below pace', () => {
      const goal = makeGoal({
        type: 'target',
        targetValue: 100,
        startAt: '2026-06-01T00:00:00',
        deadline: '2026-07-01T00:00:00',
      });
      // expected 50%, actual 20%
      const entries = [makeEntry({ kind: 'increment', value: 20 })];
      expect(calcPaceStatus(goal, entries, now)).toBe('behind');
    });
  });

  describe('calcStrengthScore', () => {
    it('all done = high score', () => {
      const goal = makeGoal({ startAt: '2026-06-10T08:00:00' });
      const entries = Array.from({ length: 5 }, (_, i) =>
        makeEntry({ kind: 'checkin', at: `2026-06-${10 + i}T09:00:00` })
      );
      const score = calcStrengthScore(goal, entries, now);
      expect(score).toBeGreaterThan(30);
    });

    it('all missed = low score', () => {
      const goal = makeGoal({ startAt: '2026-06-10T08:00:00' });
      const entries = Array.from({ length: 5 }, (_, i) =>
        makeEntry({ kind: 'miss', at: `2026-06-${10 + i}T09:00:00` })
      );
      const score = calcStrengthScore(goal, entries, now);
      expect(score).toBeLessThan(50);
    });
  });

  describe('calcMoneySaved', () => {
    it('quit: costPerDay * days', () => {
      const goal = makeGoal({ type: 'quit', costPerDay: 10, startAt: '2026-06-01T08:00:00' });
      expect(calcMoneySaved(goal, now)).toBe(140); // 14 days * $10
    });

    it('non-quit returns 0', () => {
      expect(calcMoneySaved(makeGoal({ costPerDay: 10 }), now)).toBe(0);
    });
  });

  describe('calcTimeSavedMinutes', () => {
    it('quit: minutesPerDay * days', () => {
      const goal = makeGoal({ type: 'quit', minutesPerDay: 30, startAt: '2026-06-01T08:00:00' });
      expect(calcTimeSavedMinutes(goal, now)).toBe(420); // 14 days * 30 min
    });
  });

  describe('milestones', () => {
    it('getNextStreakMilestone', () => {
      expect(getNextStreakMilestone(0)).toBe(1);
      expect(getNextStreakMilestone(2)).toBe(3);
      expect(getNextStreakMilestone(7)).toBe(14);
      expect(getNextStreakMilestone(365)).toBeNull();
    });

    it('getProgressToNextMilestone', () => {
      expect(getProgressToNextMilestone(0)).toBe(0); // 0/1
      expect(getProgressToNextMilestone(2)).toBeCloseTo(0.5); // (2-1)/(3-1) = 0.5
    });
  });

  describe('computeAllStats', () => {
    it('returns all fields', () => {
      const goal = makeGoal({ type: 'quit', costPerDay: 5, startAt: '2026-06-01T08:00:00' });
      const entries = [makeEntry({ kind: 'checkin', at: '2026-06-14T09:00:00' })];
      const stats = computeAllStats(goal, entries, [], now);

      expect(stats).toHaveProperty('progressPct');
      expect(stats).toHaveProperty('currentStreak');
      expect(stats).toHaveProperty('bestStreak');
      expect(stats).toHaveProperty('totalCleanDays');
      expect(stats).toHaveProperty('strengthScore');
      expect(stats).toHaveProperty('moneySaved');
      expect(stats.moneySaved).toBe(70); // 14 days * $5
    });
  });
});