/**
 * XP values — tunable constants.
 * §5.4: never negative XP for honesty (miss/slip = 0 XP, never negative).
 */

export const XP_VALUES = {
  CHECKIN_YES:        20,   // goal checked in "yes" (per goal per day)
  DAILY_RITUAL:       10,   // daily check-in ritual completed (any answers)
  MORNING_PLEDGE:     10,
  URGE_RESISTED:      50,
  FOCUS_SESSION:      25,
  MILESTONE_UNLOCKED: 250,
  SLIP_OR_MISS:        0,   // NEVER negative — honesty is never punished
} as const;

export type XPAction = keyof typeof XP_VALUES;

/** Level thresholds — XP required to reach each level */
export const LEVEL_THRESHOLDS = [
  0,     // level 1
  100,   // level 2
  300,   // level 3
  600,   // level 4
  1000,  // level 5
  1500,  // level 6
  2200,  // level 7
  3000,  // level 8
  4000,  // level 9
  5500,  // level 10
  7500,  // level 11
  10000, // level 12
] as const;

export function getLevel(totalXP: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

export function getXPToNextLevel(totalXP: number): number {
  const level = getLevel(totalXP);
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? Infinity;
  return nextThreshold === Infinity ? 0 : nextThreshold - totalXP;
}