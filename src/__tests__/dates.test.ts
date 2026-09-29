import {
  startOfToday,
  diffCalendarDays,
  isSameDay,
  daysSince,
  daysUntil,
  dayKey,
  addDays,
  startOfWeek,
  isLeapYear,
  daysInMonth,
  formatElapsed,
} from '@/lib/dates';

describe('dates', () => {
  describe('diffCalendarDays', () => {
    it('returns 0 for same day', () => {
      const a = new Date('2026-06-15T14:30:00');
      const b = new Date('2026-06-15T00:00:00');
      expect(diffCalendarDays(a, b)).toBe(0);
    });

    it('returns positive for later date', () => {
      const a = new Date('2026-06-16T00:00:00');
      const b = new Date('2026-06-15T23:59:59');
      expect(diffCalendarDays(a, b)).toBe(1);
    });

    it('handles DST spring forward (US)', () => {
      // 2026-03-08 is DST spring forward in US
      const before = new Date('2026-03-07T12:00:00');
      const after = new Date('2026-03-09T12:00:00');
      expect(diffCalendarDays(after, before)).toBe(2);
    });

    it('handles DST fall back (US)', () => {
      // 2026-11-01 is DST fall back in US
      const before = new Date('2026-10-31T12:00:00');
      const after = new Date('2026-11-02T12:00:00');
      expect(diffCalendarDays(after, before)).toBe(2);
    });

    it('handles leap year Feb 29', () => {
      const before = new Date('2028-02-28T12:00:00');
      const after = new Date('2028-03-01T12:00:00');
      expect(diffCalendarDays(after, before)).toBe(2);
    });

    it('handles year boundary', () => {
      const before = new Date('2025-12-31T23:59:59');
      const after = new Date('2026-01-01T00:00:01');
      expect(diffCalendarDays(after, before)).toBe(1);
    });
  });

  describe('isSameDay', () => {
    it('same calendar day different times', () => {
      const a = new Date('2026-06-15T00:00:00');
      const b = new Date('2026-06-15T23:59:59');
      expect(isSameDay(a, b)).toBe(true);
    });

    it('different days', () => {
      const a = new Date('2026-06-15T23:59:59');
      const b = new Date('2026-06-16T00:00:00');
      expect(isSameDay(a, b)).toBe(false);
    });
  });

  describe('daysSince', () => {
    it('returns 0 on the start day', () => {
      const now = new Date('2026-06-15T14:00:00');
      expect(daysSince('2026-06-15T08:00:00', now)).toBe(0);
    });

    it('returns 1 the next day', () => {
      const now = new Date('2026-06-16T00:00:01');
      expect(daysSince('2026-06-15T23:59:59', now)).toBe(1);
    });

    it('returns 0 for future start', () => {
      const now = new Date('2026-06-15T10:00:00');
      expect(daysSince('2026-06-20T08:00:00', now)).toBe(0);
    });
  });

  describe('daysUntil', () => {
    it('positive for future deadline', () => {
      const now = new Date('2026-06-15T10:00:00');
      expect(daysUntil('2026-06-25T23:59:59', now)).toBe(10);
    });

    it('negative for past deadline', () => {
      const now = new Date('2026-06-15T10:00:00');
      expect(daysUntil('2026-06-10T23:59:59', now)).toBe(-5);
    });

    it('0 for today', () => {
      const now = new Date('2026-06-15T10:00:00');
      expect(daysUntil('2026-06-15T23:59:59', now)).toBe(0);
    });
  });

  describe('dayKey', () => {
    it('formats correctly', () => {
      expect(dayKey(new Date('2026-01-05T14:30:00'))).toBe('2026-01-05');
    });

    it('pads single digits', () => {
      expect(dayKey(new Date('2026-03-07T00:00:00'))).toBe('2026-03-07');
    });
  });

  describe('addDays', () => {
    it('adds days correctly', () => {
      const result = addDays(new Date('2026-06-15T12:00:00'), 5);
      expect(result.getDate()).toBe(20);
    });

    it('crosses month boundary', () => {
      const result = addDays(new Date('2026-06-28T12:00:00'), 5);
      expect(result.getMonth()).toBe(6); // July
      expect(result.getDate()).toBe(3);
    });
  });

  describe('startOfWeek', () => {
    it('returns Monday', () => {
      // 2026-06-17 is a Wednesday
      const result = startOfWeek(new Date('2026-06-17T12:00:00'));
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(15);
    });
  });

  describe('isLeapYear', () => {
    it('2028 is leap', () => expect(isLeapYear(2028)).toBe(true));
    it('2100 is not leap', () => expect(isLeapYear(2100)).toBe(false));
    it('2000 is leap', () => expect(isLeapYear(2000)).toBe(true));
    it('2026 is not leap', () => expect(isLeapYear(2026)).toBe(false));
  });

  describe('daysInMonth', () => {
    it('Feb in leap year', () => expect(daysInMonth(2028, 1)).toBe(29));
    it('Feb in non-leap year', () => expect(daysInMonth(2026, 1)).toBe(28));
    it('December', () => expect(daysInMonth(2026, 11)).toBe(31));
  });

  describe('formatElapsed', () => {
    it('shows days and hours', () => {
      const now = new Date('2026-06-20T14:00:00');
      const result = formatElapsed('2026-06-12T08:00:00', now);
      expect(result.days).toBe(8);
      expect(result.label).toContain('d');
    });

    it('shows hours and minutes for short durations', () => {
      const now = new Date('2026-06-15T12:30:00');
      const result = formatElapsed('2026-06-15T10:00:00', now);
      expect(result.days).toBe(0);
      expect(result.hours).toBe(2);
      expect(result.minutes).toBe(30);
    });
  });
});