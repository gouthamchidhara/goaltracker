# Build Spec: "Northstar" — Goal Tracker with Home & Lock Screen Widgets

> **Audience:** GPT Luna agent (autonomous builder).
> **Platforms:** iOS + Android.
> **Priority order:** 1) Widgets that work reliably, 2) UI polish/motion, 3) Motivation loop, 4) Everything else.
> Working name is "Northstar" — rename freely via a single constant.

---

## 1. Product Summary

A goal-tracking app that keeps goals **visible all day** by living on the home screen and lock screen. Every phone unlock = a glance at progress. The app must feel premium, animated, and rewarding so people *want* to open it.

Supports any goal type:
- **Education** — "Pass AWS SAA by Dec 15", "Study 1 hr/day", "Read 20 books this year"
- **Personal / fitness** — "Run 5K", "Save $5,000", "Meditate daily"
- **Quitting / recovery** — "Days without smoking", "Days sober", "No social media after 10pm"
- **Anything** — freeform target, counter, or deadline

Short-term (days/weeks) and long-term (months/years) goals both supported, and long-term goals can be broken into sub-goals/milestones.

**Positioning (why this wins vs. market):**
- **One app for all three jobs:** build habits + break addictions + hit deadline goals. Competitors do one or two.
- **Lock-screen-first.** Competitors treat widgets as an afterthought; here it's the headline feature.
- **Cross-platform day 1.** Top competitors are locked to one platform (several Apple-only, others Android-only).
- **Generous free tier, no ads in recovery flows.** Competitors cap free habits at 2–3 or show ads to people in recovery.
- **Honest, motivating progress.** Streaks + habit-strength score. No freezes, no skips — every day counts, but one miss is framed as a comeback, not a failure.

See **Section 5.2** for competitor-inspired features and **Section 12** for the competitive reference table.

---

## 2. Tech Stack (use exactly this unless blocked)

| Layer | Choice |
|---|---|
| App framework | **Expo (React Native), SDK latest stable, TypeScript strict** |
| Build | **EAS Build** with development builds (widgets require native code; Expo Go will NOT work) |
| Navigation | `expo-router` (file-based) |
| State | `zustand` |
| Local DB | `expo-sqlite` (source of truth), local-first, works fully offline |
| Animation | `react-native-reanimated` v3 + `react-native-gesture-handler` |
| Graphics | `@shopify/react-native-skia` (progress rings, gradients, particle/confetti) |
| Haptics | `expo-haptics` |
| Notifications | `expo-notifications` (local scheduled only for v1) |
| Biometrics | `expo-local-authentication` (app lock) |
| iOS widgets | **WidgetKit + SwiftUI** via `@bacons/apple-targets` (Expo config plugin for native targets) |
| Android widgets | **Jetpack Glance (Kotlin)** via a custom Expo config plugin, OR `react-native-android-widget` if Glance plugin setup blocks progress |
| Shared widget data | iOS: **App Group** `UserDefaults(suiteName:)`; Android: `SharedPreferences` / DataStore. App writes a compact JSON snapshot; widgets read it. |
| Fonts | **Space Grotesk** (display, numerals) + **Manrope** (body/UI) via `expo-font` / `@expo-google-fonts/*` — see §14 |
| Live Activities (iOS) | ActivityKit inside the same widget extension (`@bacons/apple-targets`) + a small Expo native module to start / update / end activities |
| Health auto-log (iOS) | `@kingstinct/react-native-healthkit` (Expo config plugin) — read-only: steps, workouts, mindful minutes, sleep, water |
| Health auto-log (Android) | `react-native-health-connect` + its Expo config plugin — same metrics via Health Connect |
| Share cards | `react-native-view-shot` + `expo-sharing` (milestone/progress images) |
| Payments (phase 5) | `react-native-purchases` (RevenueCat) — stub only until owner provides keys |

**Do not** add a backend in v1. Architecture must allow optional cloud sync later (keep a `SyncAdapter` interface stub).

---

## 3. Goal Model

### 3.1 Goal types (all must be supported)

| Type | Description | Widget shows | Example |
|---|---|---|---|
| `countdown` | Deadline-based | Days left + % progress | "Exam in 23 days" |
| `streak` | Consecutive days of doing/avoiding something | Big day counter | "Day 47 smoke-free" |
| `quit` (abstinence timer) | Time since last slip, live-ticking | Days + hours since start | "12d 4h sober" |
| `target` | Numeric target accumulated over time | current / target + ring | "12 / 20 books" |
| `habit` | Frequency per period (X times per day/week) | This period's check-ins | "3 / 5 workouts this week" |
| `milestone` | Long-term goal made of sub-goals | Sub-goals done / total | "Launch app: 4 / 9 steps" |

### 3.2 TypeScript data model

```ts
type GoalType = 'countdown' | 'streak' | 'quit' | 'target' | 'habit' | 'milestone';
type Horizon = 'short' | 'long';            // short ≤ 90 days, long > 90 days (auto-suggested, user-editable)
type Category = 'education' | 'health' | 'fitness' | 'finance' | 'career' | 'recovery' | 'personal' | 'custom';

interface Goal {
  id: string;
  title: string;
  emoji: string;                // shown in widgets
  color: string;                // theme accent, hex
  type: GoalType;
  horizon: Horizon;
  category: Category;
  why: string;                  // user's reason — core motivator, shown on slips/low days
  whyPhotoUri?: string;         // optional photo (family, dream, etc.)
  startAt: string;              // ISO
  deadline?: string;            // ISO (countdown / target / milestone)
  targetValue?: number;         // target / habit
  unit?: string;                // "books", "$", "km", "hrs"
  period?: 'day' | 'week' | 'month';  // habit
  parentId?: string;            // sub-goal of a milestone goal
  pinnedToWidget: boolean;
  privateOnWidget: boolean;     // hide title on lock screen (show emoji + number only)
  // --- competitive features ---
  costPerDay?: number;          // quit goals: money saved calc (user's own spend)
  currency?: string;            // ISO 4217, default from device locale
  minutesPerDay?: number;       // quit goals: time saved calc
  healthMetric?: 'steps' | 'workouts' | 'mindful_minutes' | 'sleep_hours' | 'water_ml'; // auto-log source
  pledgeEnabled: boolean;       // daily pledge ritual (default true for recovery)
  routineId?: string;           // linked guided routine
  archivedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Entry {               // every check-in / increment / slip
  id: string;
  goalId: string;
  kind: 'checkin' | 'miss' | 'increment' | 'slip' | 'note' | 'pledge' | 'review' | 'urge_resisted' | 'auto' | 'focus_session';
  value?: number;
  note?: string;
  mood?: 1 | 2 | 3 | 4 | 5;
  triggers?: string[];          // slip / urge: chosen trigger chips (see 5.3 C)
  durationSec?: number;         // focus_session / urge timer length
  at: string;                   // ISO
}

interface StreakRecord {        // keeps history when a streak/quit timer resets
  goalId: string;
  startAt: string;
  endAt: string;
  lengthDays: number;
}

interface Routine {             // guided step-by-step routine (morning, study block, etc.)
  id: string;
  title: string;
  steps: { id: string; label: string; emoji: string; durationSec: number; goalId?: string }[];
  scheduledTime?: string;       // "07:00"
}

interface FocusSession {        // timed session shown as Live Activity / ongoing notification
  id: string;
  goalId: string;
  plannedSec: number;           // default 25 min, user-set
  startedAt: string;
  pausedAt?: string;
  accumulatedPauseSec: number;
  endedAt?: string;
  completed: boolean;           // true only if user taps Finish (or timer completes); writes a 'focus_session' Entry
}

interface Buddy {               // accountability partner (phase 5, needs backend)
  id: string;
  displayName: string;
  sharedGoalIds: string[];      // user chooses exactly what is shared
  inviteCode: string;
}
```

Derived values (computed, not stored): `progressPct`, `currentStreak`, `bestStreak`, `totalCleanDays`, `daysLeft`, `paceStatus` ('ahead' | 'on_track' | 'behind'), `projectedCompletionDate`, `strengthScore` (0–100, see 5.2), `moneySaved`, `timeSaved`.

---

## 4. Widgets (MOST IMPORTANT FEATURE)

### 4.1 iOS (WidgetKit)

**Home screen** (layouts match mockup #6):
- `systemSmall` — two variants, chosen automatically by goal type:
  - *Counter* (quit/streak): title + goal icon top row; ring (goal color, % to next milestone) with big number center; side labels "days" + money saved (quit); footer "13 days to next badge". Tap → goal detail (`northstar://goal/{id}`).
  - *Action* (countdown/target/habit): title + % top row; big number ("23") + label ("days to exam"); full-width interactive button in goal color ("Log study" / "+1" / "Check in") → turns to "Done" after tap.
- `systemMedium` — list of 3 goals: color dot, title, value (tabular), thin progress bar, round "+" button (44 pt hit area) per row. Or single-goal detailed view (user picks in config).
- `systemLarge` — dashboard: header "Today" + "2 of 4 done"; 2×2 tiles (label, big colored value like "47d", "23d", "12/20", "3/5", status line like "Strength 82" / "On track" / "Ahead of pace" / "2 to go this week"); bottom: 12-week contribution grid for the pinned goal.

**Lock screen (iOS 16+)** (mockup #5), all monochrome/vibrant-rendering safe:
- `accessoryCircular` — ring gauge + number with tiny uppercase unit underneath ("47 / DAYS", "3/5 / GYM"). Unit label = user-set short label (max 4 chars) or type default.
- `accessoryRectangular` — title + % on first line, big value ("23 days left") second line, thin progress bar third line.
- `accessoryInline` — single line above clock: goal icon/emoji + "Smoke-free · 47 days".
- **Reminder notifications** shown on lock screen use the same voice: "Day 47. Take today's pledge — for Maya." (why text inserted only if goal not private).

**Requirements:**
- **Configurable widgets** via `AppIntentConfiguration` — user picks which goal each widget shows.
- **Interactive widgets (iOS 17+)** — a `Button(intent:)` for "+1" / "Check in" directly on home screen widget, no app open. Intent writes to App Group, updates snapshot, reloads timeline.
- **Live counters** for `quit` type: use `Text(date, style: .relative)` / `.timer` so time ticks without timeline reloads.
- Timeline: refresh at midnight local time + after every app write (`WidgetCenter.shared.reloadAllTimelines()` via native module).
- Respect `privateOnWidget`: show emoji + number only, no title.
- Use `containerBackground` (iOS 17) and support tinted / vibrant rendering modes on lock screen.
- **Live Activity + Dynamic Island (REQUIRED, phase 3)** — for Focus Sessions (§5.3 D):
  - Lock screen banner: goal icon + name ("Deep study · AWS SAA"), session count ("Session 2 of 3 today"), big ticking timer (`Text(timerInterval:)`), progress bar, context line ("Exam in 23 days · 68% ready"), **Pause** and **Finish** buttons (App Intents, iOS 17+).
  - Dynamic Island compact: mini ring + label on leading side, remaining time on trailing side. Minimal: ring only. Expanded: same as lock screen banner.
  - Ends automatically when timer completes (logs session) or on Finish. Stale after planned time + 15 min.
  - Config: `NSSupportsLiveActivities = YES` in app Info.plist (via config plugin); min iOS 16.2 for Live Activities, buttons iOS 17+. If the user disabled Live Activities, fall back to a time-sensitive local notification at session end.

### 4.2 Android (Glance)

**Home screen:**
- Small (2x2) — single goal ring + number.
- Medium (4x2) — single goal detailed or 3-goal list.
- Large (4x4) — dashboard.
- Resizable, Material You dynamic color support, with app theme fallback.
- **Interactive**: `actionRunCallback` for "+1" / "Check in" buttons.
- Configuration activity to pick goal per widget instance.

**Lock screen:**
Android phones do not have a universal lock screen widget API like iOS. Implement:
1. **Ongoing notification (opt-in)** — low-priority, silent, persistent notification showing pinned goal(s): "🚭 Day 47 smoke-free · 13 days to next badge". Visible on lock screen. User toggles per goal. Use `setVisibility(VISIBILITY_PUBLIC)` unless `privateOnWidget` → `VISIBILITY_PRIVATE` with redacted public version.
   - Layout: app label "Northstar · Ongoing", title ("Day 47 smoke-free"), subtitle ("13 days to next badge · $470 saved"), right-aligned % to next milestone, progress bar, and **action buttons**: `Pledge today` (hidden once pledged) and `I feel an urge` (deep link to Urge Toolkit) for quit goals; `Check in` / `+1` for other goal types.
   - Additional pinned goals show as compact secondary notifications (icon + "AWS SAA exam · 23 days" + "68% ready · on track").
   - Private goals render as "Private goal · 9 days" with a lock icon.
   - Focus Sessions on Android: foreground-service notification with `setUsesChronometer(true)` + `setChronometerCountDown(true)` + Pause / Finish actions (Android equivalent of the Live Activity).
   - Permissions: `POST_NOTIFICATIONS` (Android 13+, request in context — when the user first pins a goal to the lock screen), `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_SPECIAL_USE` for focus sessions. Explain the benefit before the system prompt; app works fully if denied (home widgets still update).
2. Where the OS supports lock screen / hub widgets (newer Android versions and some tablets/OEMs), make Glance widgets eligible for keyguard category (`android:widgetCategory="home_screen|keyguard"`). Degrade gracefully where unsupported.

Refresh: `WorkManager` periodic + midnight + immediate update after every app write.

### 4.3 Shared snapshot contract

App writes this JSON to the shared store after every mutation (keep < 20 KB):

```json
{
  "version": 1,
  "generatedAt": "2026-09-28T14:00:00Z",
  "theme": "dark",
  "goals": [
    {
      "id": "g_123",
      "title": "Smoke-free",
      "emoji": "🚭",
      "color": "#7C5CFF",
      "type": "quit",
      "startAt": "2026-08-12T09:00:00Z",
      "primaryValue": 47,
      "primaryLabel": "days",
      "progressPct": 0.78,
      "nextMilestone": 60,
      "secondaryText": "13 days to next badge",
      "doneToday": true,
      "private": false,
      "quote": "For Maya. For my lungs.",
      "strength": 82,
      "savedText": "$470 saved",
      "pledgedToday": true,
      "icon": "quit",
      "unitShort": "DAYS",
      "actionLabel": "Pledge",
      "grid12w": "0000000000000000000000111111111111110211111111111111111111111111111111111111111111"
    }
  ],
  "summary": { "doneToday": 2, "dueToday": 4 },
  "focus": {
    "goalId": "g_456",
    "title": "Deep study · AWS SAA",
    "endsAt": "2026-09-28T15:18:42Z",
    "paused": false,
    "sessionIndex": 2,
    "sessionTarget": 3
  }
}
```

Widgets must render from this snapshot alone — never query SQLite from widget code.
- `icon`: stroke-icon key from the shared icon set (countdown, streak, quit, target, habit, milestone, book, dumbbell…) used when the user hasn't picked an emoji.
- `grid12w`: 84 chars, oldest → newest, one per day: `0` before start, `1` done/clean, `2` slip, `3` miss. Used by the large widget grid.
- `focus`: present only while a Focus Session is active; `null` otherwise.

---

## 5. Motivation Engine

The app must *actively push* users forward, not just record data.

1. **"Why" anchor** — required field at goal creation (text + optional photo). Shown on: goal detail header, slip flow, low-streak days, and optionally rotated on widgets.
2. **Milestones & badges** — auto milestones: day 1, 3, 7, 14, 30, 60, 90, 180, 365 for streak/quit; 10/25/50/75/100% for target/milestone. Each unlock = full-screen celebration (Skia confetti, haptic `notificationSuccess`, shareable card).
3. **Pace indicator** — for deadline goals: "Ahead of pace 🔥", "On track", "Behind — 3 pages/day gets you back". Always show the *recovery math*, not just the status.
4. **Levels / XP** — levels unlock themes and widget styles. Keep it light, not casino-like. Fixed XP values (tunable constants in `features/motivation/xp.ts`):

   | Action | XP |
   |---|---|
   | Goal checked in "yes" (per goal, per day) | +20 |
   | Daily check-in ritual completed (any answers) | +10 |
   | Morning pledge | +10 |
   | Urge resisted ("I made it through") | +50 |
   | Focus session finished | +25 |
   | Milestone unlocked | +250 |
   | Honest "Not today" / slip | 0 (never negative — honesty is never punished with XP loss) |
5. **Smart reminders** — local notifications at user-chosen times; not sent if already checked in today; escalating but kind tone. Max 3/day total across all goals.
6. **Daily check-in ritual** — full spec in §5.3 A. Card-per-goal, < 15 seconds total, today only.
7. **Weekly review** — Sunday card: wins, streaks, pace, one reflection prompt.
8. **Motivational copy bank** — 200+ short lines, categorized (education, recovery, fitness, etc.), no cheesy clichés, rotated contextually.
9. **Optional AI coach (phase 4, behind feature flag)** — breaks a long-term goal into sub-goals and weekly plan. Stub the interface; do not hardcode an API key.

### 5.1 Recovery / quit goals — special handling (REQUIRED)

- **Slip ≠ failure.** Logging a slip: compassionate copy ("One day doesn't erase 47. Let's start again."), shows the "why", saves old streak to `StreakRecord`, displays **total clean days** and **best streak** alongside current streak.
- Never use shame language, red "FAILED" states, or broken-chain imagery for slips.
- **Urge Toolkit** — full spec in §5.3 B. Resisting counts as a win.
- **Comeback screen** after every slip — full spec in §5.3 C.
- **Support link** in recovery goal settings: user-configurable contact ("Call my sponsor") + a region-appropriate helpline entry the user can edit. Do not hardcode medical claims.
- Privacy defaults ON for `recovery` category: `privateOnWidget = true`, app-lock suggestion on creation.

### 5.2 Competitor-inspired features (REQUIRED unless marked optional)

Build original implementations of these proven patterns. **Do not copy any competitor's name, copy text, artwork, icons, mascots, or layouts.**

1. **Habit Strength Score (0–100)** — shown next to streak on cards, detail, and medium/large widgets.
   - Exponential moving average of daily completion: `score = score * decay + (done ? 1 : 0) * (1 - decay)`, where `decay` derives from a tunable half-life (default ~14 days for daily goals; scale for weekly habits).
   - Every calendar day in the goal's schedule counts. A miss always counts as a miss — it drops the score, it is never excused.
   - Copy: "Strength 82 — solid habit" rather than just "streak broken".


2. **Contribution Grid** — GitHub-style year grid on goal detail and Insights (intensity = completion % or value). Scrollable, tappable days → entries for that day. Also a large-widget variant showing last 12 weeks.

3. **Daily Pledge + Evening Review** (default ON for recovery, optional elsewhere)
   - Morning: one-tap pledge card ("Today I commit to staying smoke-free") with the user's why + photo. Haptic + subtle animation.
   - Evening: quick review — "How did today go?" mood 1–5 + optional note.
   - Notification pair: morning pledge + evening review, respecting the 3/day cap.
   - Pledge streak tracked separately. Widget shows ✅ when pledged today.

4. **Savings & Gains Calculator** (quit goals) — money saved (`costPerDay × clean days`) and time saved (`minutesPerDay × clean days`). Shown as animated counters on detail + optional widget line. "Reward jar": user sets a reward ("New headphones — $200"), progress bar fills from money saved.

5. **Health Recovery Timeline** (quit goals, optional per goal) — milestone list of body/health improvements over time since quitting.
   - Content lives in `/src/content/recovery-timelines.json`, **each item with a source citation field**. Use the seed content in **Section 13.1** verbatim (smoking). Other substances: leave empty arrays + `TODO(owner)` — do not invent entries.
   - Show a "general information, not medical advice" note on the timeline screen. No invented medical claims.
   - **Alcohol / sedative quit goals must show the withdrawal safety gate in Section 13.2 before the goal is created.**

6. **Health / Fit Auto-Logging** — link a goal to `healthMetric`; app reads HealthKit / Health Connect on open + background refresh and writes `kind: 'auto'` entries. Read-only permissions. Manual check-in allowed for today only. Gracefully handle permission denied.

7. **Guided Routines** — sequence of timed steps (e.g., "Morning: water → stretch 5m → review goals 2m → study 25m"). Full-screen player with big timer ring, next-step preview, haptics per step, auto-checks linked goals on completion. Launchable from widget deep link.

8. **Urge Toolkit** (quit goals) — see §5.3 B for exact screen behavior.

9. **Companion Character (optional, phase 4)** — original mascot that reacts to progress (idle, cheering, sleepy when neglected — never sad/guilt-tripping). Evolves with level. Appears on Today screen and optionally a widget. Must be fully original art.

10. **Share Cards** — auto-generated milestone images ("Day 100 🚭", "Exam goal 80% done") with themed backgrounds. Private goals default to hiding the title on share cards too.

11. **Accountability Buddy (phase 5, requires backend)** — invite one or more buddies via code/link; share only selected goals; buddy sees progress + can send a pre-set cheer. No chat in v1. Build only the local UI + `BuddyAdapter` interface stub until owner provides backend.

12. **Monetization rules (phase 5 wiring, design now)**
    - **Free forever:** unlimited goals, all goal types, all widget sizes, lock screen widgets, reminders, recovery tools, export.
    - **Premium:** extra themes & widget styles, advanced insights, cloud sync, buddies, companion cosmetics, routines beyond 3.
    - **No ads anywhere.** Never put any paywall inside slip, urge, or crisis-support flows.

### 5.3 Key moment screens (REQUIRED — match mockups in §14)

**A. Daily Check-in Ritual**
- Entry points: "Check in" pill button in Today header, reminder notification tap, widget deep link `northstar://checkin`.
- Header: close button, "Daily check-in", counter "2/4". Below: segmented progress bar, one segment per goal due today — done = goal color, missed = muted grey `#5A5E6B`, current = white, upcoming = `#262933`.
- One card per goal (stacked-card look: 2 cards peeking behind). Card: goal-color border, icon in circle, type line ("Quit · day 47", "Countdown · 23 days"), big question ("Smoke-free today?", "Studied for AWS SAA?"), context line (the why, or pace math like "2 more this week to hit your goal").
- Two buttons: primary (goal color, ~2/3 width) = yes label ("Yes, smoke-free", "Studied", "Read", "Worked out"); secondary outline (~1/3) = honest no ("I slipped" for quit goals → routes to Comeback screen after the ritual; "Not today" for others → writes `kind: 'miss'`).
- Swipe right = yes, swipe left = no (with haptics), buttons for accessibility.
- Footer text: "Only today can be logged. Honest answers keep your progress real."
- Finish screen: teal check circle, "Today is logged", "3 of 4 goals done today", XP earned, "Back to Today".
- Goals already checked in today are not shown. If none due → friendly "All caught up" state.

**B. Urge Toolkit** ("Ride the wave")
- Entry: "I feel an urge" on goal detail, Android ongoing notification action, Comeback screen "Talk to someone".
- Headline "Urges peak, then pass." + "Stay with it for five minutes. Just breathe."
- Breathing orb: concentric circles scaling 0.62 → 1.0 → 0.62 on a 10 s loop (4 s in, 2 s hold, 4 s out). Center shows live countdown from 5:00 (tabular numerals) + phase label ("Breathe in" / "Hold" / "Breathe out"). Soft haptic tick on each phase change. Reduce-motion: static orb, phase label still updates.
- "Remember why" card (why photo + text + "47 days strong").
- Two quick-call buttons: user's support contact ("Call Sam") and the relevant helpline from §13.3 (e.g., Quitline for smoking).
- Primary button "I made it through" → writes `urge_resisted` entry, +50 XP, button turns teal "Logged · +50 XP", small celebration. Available anytime (not only after 5:00).
- Leaving without tapping logs nothing (no penalty).

**C. Comeback Screen** (after any slip)
- Eyebrow "Slip logged · honest counts". Headline "One day doesn't erase {previousStreak}." Subtext: "Your streak restarts, but everything you built stays on the record."
- 2×2 stat grid: Total clean days (kept), Best streak (to beat), Money saved (kept), Strength (new value + "was 82") — strength visibly drops; it is honest, not hidden.
- "What set it off? (Optional)" multi-select trigger chips — defaults per substance (smoking: Stress, Friends smoking, After a drink, Boredom, Coffee, Bad sleep) + "Add your own". Saved to the slip entry's `triggers`. Insights later shows top triggers.
- Why card ("Still your why").
- Buttons: primary "Start day 1 now" (resets current streak start to now), secondary "Talk to someone" (opens Urge Toolkit / support resources).
- Tone rules: amber/neutral palette only, never red, no broken-chain or sad imagery.

**D. Focus Sessions** (any goal, most useful for study/countdown goals)
- Start from goal detail ("Start focus session") or Routine player. Default 25 min, user-adjustable.
- Runs as iOS Live Activity + Dynamic Island (§4.1) / Android chronometer notification (§4.2).
- Finish or timer completion writes a `focus_session` entry and counts as that goal's check-in for today (if goal type allows). Pause is allowed within a session; it never excuses a missed day.
- Detail screen shows today's session count ("Session 2 of 3 today") against an optional daily session target.

---

## 6. Screens

1. **Onboarding** (3 screens max) — value prop with animated widget preview → pick 1st goal template → prompt to add widget (with animated how-to for iOS and Android separately).
2. **Home / Today** — header: date, "Today", **"Check in" pill** (→ ritual) + "+" (→ Create). Hero card for top goal: big ring with day count, "Next badge · day 60", inline stats (Best · Strength · Saved), pledge button (toggles to "Pledged for today"). "Your goals" list: mini ring with value, title, status line (pace colored), quick action button ("Log" / "+1" / "Check in" → "Done" when complete). Bottom tabs: Today, Insights, Awards, Settings.
3. **Goal Detail** — back/options bar, why card with photo, giant counter (live h/m/s for quit goals, "since Aug 12"), stat trio (Best streak · Total clean days · Strength), money/time saved + reward jar, 12-week contribution grid (clean = goal color, slip = neutral light grey, before start = dark), recovery timeline (reached ✓ / next with countdown, source + disclaimer), "Start focus session" (non-quit goals), "I feel an urge" + "Log a slip" (quit goals).
4. **Create / Edit Goal** — step flow: type → title + emoji + color → target/deadline → why → reminders → widget pinning + privacy. Live preview of the widget as they build it.
5. **Daily Check-in** — §5.3 A.
6. **Insights** — charts: consistency %, trends, best times of day, goal completion rate.
7. **Achievements** — badge wall, levels.
8. **Widget Studio** — pick widget style/theme, preview all sizes, instructions to add.
9. **Settings** — theme, app lock, notifications, health connections, export/import (JSON), privacy, about.
10. **Pledge / Review** — morning pledge card + evening review sheet.
11. **Routine Builder + Player** — build steps; full-screen timed player.
12. **Urge Toolkit** — §5.3 B.
13. **Savings & Rewards** — money/time saved, reward jars.
14. **Share Card composer** — preview + share milestone image.
15. **Comeback** — §5.3 C.
16. **Milestone celebration** — confetti, big badge ring with number ("60 days"), headline ("Two months smoke-free"), encouraging line, stats (Best streak · Saved · XP), reward jar unlock row, "Share milestone" + "Keep going".
17. **Focus session** (in-app view) — big timer ring, pause/finish, mirrors the Live Activity.

Templates library at creation: ~30 prebuilt goals across categories (e.g., "Quit smoking", "Study daily", "Read 12 books", "Save emergency fund", "10K steps", "No doomscrolling").

---

## 7. UI / Design Requirements (UI-intensive — non-negotiable)

- **Feel:** premium, calm, alive. Reference quality bar: Apple Fitness rings, Streaks, Opal, Things 3.
- **Dark mode first**, full light mode. Near-black ground, solid toned surfaces, vivid per-goal accent colors. **No gradient washes, no emoji in UI chrome** (use stroke icons, e.g. `lucide-react-native`); emoji allowed only in user-chosen goal emoji. Exact tokens in §14.
- **Motion everywhere, 60fps:**
  - Progress rings animate from 0 → value on mount (spring).
  - Numbers roll/tick up (animated counters).
  - Check-in = ring fill + haptic + micro-burst particles.
  - Shared element transition card → detail.
  - Press states scale 0.97 with spring.
  - Milestone = full-screen celebration.
- **Haptics** on every meaningful action (light for taps, success for check-ins, heavy for milestones).
- **Typography:** Space Grotesk for numerals/headings (tabular figures), Manrope for UI text. Big bold numbers are the hero of every screen and widget.
- **Touch targets** ≥ 44 pt everywhere, including widget buttons.
- **Design tokens** in one file (`theme/tokens.ts`): colors, spacing (4pt grid), radii, typography, shadows, motion durations/springs. Widgets must use matching colors/fonts (mirror tokens in Swift + Kotlin).
- **Accessibility:** Dynamic Type / font scaling, VoiceOver/TalkBack labels, reduce-motion support (replace animations with fades), 4.5:1 contrast minimum.
- **Empty states** are illustrated and encouraging, never blank.
- 12 goal accent colors + 6 app themes (some unlocked by level).

---

## 8. Project Structure

```
/app                      # expo-router screens
  (tabs)/index.tsx        # Today
  (tabs)/insights.tsx
  (tabs)/achievements.tsx
  (tabs)/settings.tsx
  goal/[id].tsx
  goal/new.tsx
  checkin.tsx             # Daily check-in ritual (§5.3 A)
  urge/[goalId].tsx       # Urge toolkit (§5.3 B)
  comeback/[goalId].tsx   # Comeback after slip (§5.3 C)
  focus/[goalId].tsx      # Focus session in-app view (§5.3 D)
  milestone/[id].tsx      # Milestone celebration (modal)
  onboarding/
/src
  components/             # Ring, Counter, GoalCard, Heatmap, Confetti, ...
  features/goals/         # store, selectors, derived calcs
  features/motivation/    # milestones, xp, copy bank, reminders
  db/                     # sqlite schema, migrations, repositories
  widgets/bridge.ts       # writes snapshot + triggers widget reload (native module)
  features/focus/         # FocusSession state machine (idle → running ⇄ paused → finished)
  features/checkin/       # due-today list, ritual state, entry writes
  content/triggers.json   # default slip/urge trigger chips per substance
  theme/tokens.ts
  lib/dates.ts            # all date math (timezone-safe)
/targets/widget           # iOS WidgetKit extension (SwiftUI) via @bacons/apple-targets — home + lock screen widgets AND the ActivityKit Live Activity / Dynamic Island UI
/modules/live-activity    # small Expo native module: start / update / end Live Activity from JS (ActivityKit), Android foreground-service chronometer notification
/android-widget           # Glance widget source + config plugin
/plugins                  # custom Expo config plugins (App Group, Android widget, notification channel)
```

---

## 9. Build Phases & Acceptance Criteria

### Phase 1 — Core + data
- SQLite schema + migrations, goal CRUD, all 6 goal types, entries, derived calcs with unit tests.
- ✅ Can create each goal type, check in, see correct progress after app restart.

### Phase 2 — Widgets (ship this before polish)
- iOS home (3 sizes) + lock screen (3 accessory types), configurable, interactive +1.
- Android home widgets (3 sizes), interactive, config activity; ongoing lock screen notification.
- Snapshot bridge + reload triggers.
- ✅ Check in from widget without opening app → app shows updated value on open.
- ✅ Quit-type counter ticks live on lock screen.
- ✅ Private mode hides titles on lock screen.
- ✅ Widgets update at local midnight (streak rollover correct across time zones/DST).

### Phase 3 — UI polish + motivation
- Full design system, animations, haptics, celebrations, milestones, XP, reminders, weekly review, recovery flows.
- Habit strength score, contribution grid, daily pledge + review, savings calculator.
- Key moment screens (§5.3): Daily Check-in, Urge Toolkit, Comeback, Focus Sessions with iOS Live Activity / Dynamic Island + Android chronometer notification.
- ✅ Check-in ritual for 4 goals completes in < 15 s; "Not today" writes a `miss`; no past-day option exists.
- ✅ Urge timer keeps counting in background and resumes correctly; "I made it through" logs `urge_resisted` + XP.
- ✅ Slip → Comeback shows kept totals, lowered strength, and saves selected triggers.
- ✅ Live Activity starts, pauses, finishes from lock screen buttons and logs the session; Dynamic Island shows ring + remaining time.
- ✅ Missing one day on a 30-day habit resets the streak and lowers the strength score; UI shows best streak + comeback message, never a "failed" state.
- ✅ No freeze, skip, pause, excuse, or backdated check-in path exists anywhere in the app or widgets.
- ✅ Money saved updates live and matches `costPerDay × totalCleanDays`.
- ✅ All interactions 60fps on mid-range Android (e.g., Pixel 6a) and iPhone 12.
- ✅ Slip flow preserves history and shows best + total.

### Phase 4 — Extras
- Insights charts (incl. top slip triggers), Widget Studio, templates, export/import, app lock, AI coach stub.
- Health auto-logging (HealthKit + Health Connect), guided routines, share cards, recovery timeline (content flagged for owner review), optional companion character.
- ✅ Steps goal auto-completes from Health data without manual check-in.

### Phase 5 — Growth (stubs until owner provides keys/backend)
- `SyncAdapter` + `BuddyAdapter` implementations, RevenueCat paywall, premium gating per 5.2 #12.
- ✅ Every free-tier feature in 5.2 #12 works with no account and no network.

---

## 10. Non-Functional Requirements

- **Offline-first**, zero network required.
- **Privacy:** no analytics SDKs in v1; all data on device; export/delete-all available.
- **Performance:** cold start < 2s; widget snapshot write < 50 ms.
- **Date correctness:** all streak/day math in user's local timezone; unit tests for DST, timezone change, midnight edge cases, leap years.
- **Min OS:** iOS 16 (lock screen widgets), interactive widgets gated to iOS 17+. Android 8+ (API 26); Glance requires compatible setup.
- **Testing:** Jest for logic; Maestro E2E for create goal → check in → milestone flow.

---

## 11. Agent Rules

1. Build phases in order; do not start Phase 3 polish before Phase 2 widgets pass acceptance criteria.
2. When a native widget step fails in Expo, fix the config plugin — do not eject the whole project or drop widget features.
3. Keep widget code small and render-only; all logic lives in the app and is baked into the snapshot.
4. Never shame the user in any copy. Recovery tone = warm, steady, forward-looking.
5. Every screen must have loading, empty, and error states.
6. Document setup in `README.md`: EAS dev build commands, App Group ID, how to add widgets on each OS.
7. Leave `TODO(owner)` comments for: bundle IDs, App Group ID, app icon, store assets, non-smoking recovery timelines, non-US support resources, RevenueCat keys, backend URLs.
8. Competitor references (Section 12) are for feature inspiration only. Never copy names, text, graphics, mascots, or screen layouts.
9. Never gate or advertise inside slip, urge, or support flows.
10. **NO streak freezes, skip days, rest days, goal/streak pause, "excused" misses, or backdated check-ins — for any goal type, free or premium, ever.** Progress must reflect what the user actually did. Check-ins are allowed only for the current local day — no editing past days. Do not add these even if a competitor has them or a library provides them. (Pausing a running Focus Session timer is fine — it never protects a streak.)

---

## 12. Competitive Reference (inspiration only)

| App | Platform | Traction (2026, public figures) | Proven pattern | Our version / improvement |
|---|---|---|---|---|
| Finch | iOS + Android | 10M+ downloads, 4.9★ from 500K+ reviews | Emotional companion, kind tone | Optional original companion; habit strength instead of guilt |
| Habit Tracker (iOS top downloader) | iOS | ~300K monthly US iOS downloads, 4.8★ (~138K ratings) | Dead-simple one-tap check-in | ≤ 15-sec daily check-in ritual + widget one-tap |
| Routinery | iOS + Android | 5M users; App Store App of the Day 2026 | Guided timed routines | Routine player linked to goals, launchable from widget |
| Streaks | Apple only | Top Apple pick; $5.99 one-time | Health auto-logging, one-time price | Cross-platform HealthKit + Health Connect auto-log |
| Strides | Apple only | — | Habit / target / average / project types | Six goal types incl. quit timer + deadline countdown |
| Loop Habit Tracker | Android only | Free, open source | Habit strength score | Strength score on both platforms + widgets |
| Habitify / TickTick | Cross-platform | Free tiers capped (3 habits / 2 check-ins per day) | Clean UI, time-of-day grouping | Same polish, no 2–3 habit free cap |
| Loggd | Cross-platform | — | Contribution grid vs. all-or-nothing streaks | Grid + streak + strength together |
| I Am Sober | iOS + Android | Premium $9.99/mo or $39.99/yr | Sober counter, why + photo, daily pledge, money saved | All included free, no ads, lock-screen-first counter |
| QuitNow / Smoke Free | iOS + Android | QuitNow markets WHO recommendation | Health recovery timeline, community | Sourced timeline; buddy system instead of open forum (v1) |

**Market gaps we target:** single app for build + break + deadline goals; lock-screen-first; true cross-platform parity; generous free tier; no ads to people in recovery; non-punishing progress model.

**Sources for traction figures (re-verify before any marketing use):**
- https://habi.app/insights/best-habit-tracker-apps/ (Finch)
- https://apprundown.com/best/habit-tracker-apps (Habit Tracker, Routinery; Sensor Tower-based)
- https://2sync.com/blog/best-habit-tracker-apps (Streaks, Loop, Habitify)
- https://toolfinder.com/best/habit-trackers (TickTick free limits)
- https://www.choosingtherapy.com/i-am-sober-app-review/ (I Am Sober pricing)

---

## 13. Bundled Content (use as-is)

### 13.1 Smoking recovery timeline seed

Source: WHO, "Tobacco: Health benefits of smoking cessation" — https://www.who.int/news-room/questions-and-answers/item/tobacco-health-benefits-of-smoking-cessation

Milestone offsets are measured from goal `startAt`. Unlock animation plays when reached. Ranges use the **start** of the range for unlock and display the full range in text.

```json
{
  "smoking": {
    "source": "World Health Organization",
    "sourceUrl": "https://www.who.int/news-room/questions-and-answers/item/tobacco-health-benefits-of-smoking-cessation",
    "disclaimer": "General information, not medical advice. Everyone's body is different.",
    "items": [
      { "id": "s1", "offsetMinutes": 20,      "rangeText": "20 minutes",  "text": "Heart rate and blood pressure drop." },
      { "id": "s2", "offsetMinutes": 720,     "rangeText": "12 hours",    "text": "Carbon monoxide level in your blood drops to normal." },
      { "id": "s3", "offsetMinutes": 20160,   "rangeText": "2–12 weeks",  "text": "Circulation improves and lung function increases." },
      { "id": "s4", "offsetMinutes": 43200,   "rangeText": "1–9 months",  "text": "Coughing and shortness of breath decrease." },
      { "id": "s5", "offsetMinutes": 525600,  "rangeText": "1 year",      "text": "Risk of coronary heart disease is about half that of a smoker's." },
      { "id": "s6", "offsetMinutes": 2628000, "rangeText": "5–15 years",  "text": "Stroke risk is reduced to that of a non-smoker." },
      { "id": "s7", "offsetMinutes": 5256000, "rangeText": "10 years",    "text": "Lung cancer risk falls to about half that of a smoker; risk of mouth, throat, esophagus, bladder, cervix and pancreas cancer decreases." },
      { "id": "s8", "offsetMinutes": 7884000, "rangeText": "15 years",    "text": "Risk of coronary heart disease is that of a non-smoker's." }
    ]
  },
  "vaping": { "items": [], "todo": "TODO(owner): add sourced content" },
  "alcohol": { "items": [], "todo": "TODO(owner): add sourced content (e.g., NIAAA / NHS)" },
  "cannabis": { "items": [], "todo": "TODO(owner): add sourced content" }
}
```

### 13.2 Withdrawal safety gate (REQUIRED for alcohol and sedative quit goals)

Stopping alcohol (and some medications like benzodiazepines) suddenly after heavy daily use can cause dangerous withdrawal, including seizures. The app is not a detox tool.

When a user creates a `quit` goal with category `recovery` and substance `alcohol` or `sedatives`, show a full-screen, non-skippable-for-3-seconds card **before** saving:

- Title: "Before you start — your safety matters"
- Body: "If you drink heavily every day, or have had shaking, sweating, hallucinations or seizures when you stopped before, talk to a doctor before quitting. Stopping suddenly can be dangerous. If you have severe symptoms after stopping, call emergency services."
- Buttons: "I understand — continue" / "Find help" (opens support resources, 13.3).
- Store acknowledgement timestamp; show once per goal. Never paywall this screen.

### 13.3 Support resources (US defaults, user-editable, localize later)

Shown in recovery goal settings, urge toolkit, slip flow, and the safety gate "Find help" button. Tap = `tel:` / `sms:` link.

| Resource | Contact | Show for |
|---|---|---|
| SAMHSA National Helpline (free, confidential, 24/7 treatment referral) | Call 1-800-662-4357 | All recovery goals |
| Quitline (tobacco) | Call 1-800-QUIT-NOW (1-800-784-8669) | Smoking / vaping |
| 988 Suicide & Crisis Lifeline | Call or text 988 | All recovery goals + any goal's slip flow |
| Emergency | 911 | Safety gate, severe withdrawal |
| User's own contact | User-set ("Call my sponsor") | All recovery goals, pinned first |

- Detect region from device locale; if not US, hide US numbers and show `TODO(owner)` placeholder list + the user's own contact.
- Keep resources in `/src/content/support-resources.json` so they can be updated without code changes.

---

## 14. Visual Reference (approved mockups) & Design Tokens

**Mockup canvas:** https://claude.ai/artifact/SvAdhb2f2Jb8xwLyJYZmN7 — `TODO(owner)`: export screenshots (PNG) into `/docs/mockups/` in the repo so the agent can view them offline. Match layout, hierarchy, and tone; exact pixel copying not required.

| # | Mockup | Spec section |
|---|---|---|
| 1 | Today | §6 #2 |
| 2 | Goal detail (quit) | §6 #3 |
| 3 | New goal · pick type (live widget preview) | §6 #4 |
| 4 | Milestone celebration | §6 #16 |
| 5 | iOS lock screen widgets (inline, 2 circular, rectangular + reminder notification) | §4.1 |
| 6 | iOS home screen widgets (2 small, medium list, large dashboard with grid) | §4.1 |
| 7 | Android lock screen (ongoing notification with actions, secondary + private goal) | §4.2 |
| 8 | iOS Live Activity + Dynamic Island (focus session) | §4.1, §5.3 D |
| 9 | Daily check-in ritual | §5.3 A |
| 10 | Urge toolkit | §5.3 B |
| 11 | Comeback after a slip | §5.3 C |

### 14.1 Color tokens (dark theme)

```ts
export const color = {
  bg:        '#0E0F13', // app ground
  surface:   '#17191F', // cards
  surface2:  '#1F222A', // raised / icon buttons / check-in card
  track:     '#262933', // ring & progress tracks, grid "before start"
  border:    '#3A3E4A', // outline buttons
  text:      '#F2F1EE',
  textSoft:  '#C9CBD2',
  textMuted: '#9A9DA8', // ≥ 4.5:1 on surface
  slip:      '#E4E2DC', // neutral slip marker — never red
  missed:    '#5A5E6B',
  // goal accents (user-selectable; default by category)
  amber:  '#F5A524', // quit / recovery   (text on it: '#1A1405')
  violet: '#8B7CFF', // education         (text on it: '#120D2B'; as text color use '#A89DFF')
  teal:   '#2EC4A5', // reading / success (as text color use '#5FD9BD')
  blue:   '#5B9DFF', // fitness           (as text color use '#8DBBFF')
  calm:   '#8CC4FF', // urge toolkit primary; orb '#1A2A3E' / '#23405F'
};
```
Extend to 12 accents; each accent needs an on-accent text color and a lighter "as text" variant meeting 4.5:1 on `surface`.

### 14.2 Type, shape, spacing

- Display / numerals: Space Grotesk 600–700, tabular figures. Hero counter 96, ring center 50–64, widget number 26–40, section titles 20.
- UI text: Manrope 500–800. Body 14–15, labels 12–13, eyebrow 11–12 uppercase with 0.08em tracking.
- Radii: cards 20–28, widget 26, pills/buttons fully rounded (height/2), small tiles 14–18.
- Buttons: primary 52–58 tall; secondary outline 1.5 px `border`; min 44.
- Rings: stroke 9 (mini), 16 (hero), round caps, start at 12 o'clock.
- Spacing: 4-pt grid; screen side padding 20; card gaps 10–16.

### 14.3 Copy tone (use these patterns)

- Progress: "Day 47. Take today's pledge — for Maya." · "13 days to next badge" · "Ahead of pace" · "2 more this week to hit your goal."
- Honesty: "Only today can be logged. Honest answers keep your progress real."
- Slip: "One day doesn't erase 47." · "Everything you built stays on the record."
- Urge: "Urges peak, then pass." · "I made it through."
- Never: "Failed", "Streak broken", "You lost", guilt, or shame language.

