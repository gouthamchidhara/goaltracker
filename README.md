# Northstar — Goal Tracker with Home & Lock Screen Widgets

A goal-tracking app that keeps goals visible all day via home screen and lock screen widgets. Cross-platform (iOS + Android), offline-first, no ads.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo (React Native) SDK 57, TypeScript strict |
| Navigation | `expo-router` (file-based) |
| State | `zustand` |
| Local DB | `expo-sqlite` (source of truth) |
| Animation | `react-native-reanimated` v3 + `react-native-gesture-handler` |
| Haptics | `expo-haptics` |
| Fonts | Space Grotesk (display) + Manrope (body) |

## Getting Started

```bash
# Install dependencies
npm install

# Start development
npx expo start

# Run on device/simulator (requires EAS dev build for native widgets)
npx expo start --ios
npx expo start --android

# Run tests
npm test

# Typecheck
npm run typecheck
```

> **Note:** Widgets require native code. Expo Go will NOT work for widget features. Use EAS Build for development builds.

## Project Structure

```
/app                    # expo-router screens
  (tabs)/               # Today, Insights, Awards, Settings
  goal/                 # goal detail, create
  checkin.tsx           # Daily check-in ritual
/src
  components/           # Shared UI components
  features/goals/       # Store, selectors, derived calcs
  features/motivation/  # Milestones, XP
  features/checkin/     # Check-in logic
  features/focus/       # Focus session state machine
  db/                   # SQLite schema, migrations, repositories
  widgets/              # Widget snapshot bridge
  content/              # Bundled JSON (triggers, recovery timelines, support)
  theme/                # Design tokens
  lib/                  # Date math utilities
  __tests__/            # Jest unit tests
/docs/mockups/          # UI mockup references (TODO(owner): export PNGs)
```

## EAS Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure (TODO(owner): set real bundle IDs and App Group ID)
eas build:configure

# Development build
eas build --profile development --platform ios
eas build --profile development --platform android
```

## App Group ID

TODO(owner): Set App Group ID for iOS widget data sharing.

## Widget Setup

### iOS
1. Build with EAS (widgets require native WidgetKit extension)
2. Long-press home screen → tap "+" → search "Northstar"
3. Choose widget size (Small / Medium / Large / Lock Screen)
4. Configure which goal to display

### Android
1. Build with EAS (widgets require native Glance extension)
2. Long-press home screen → tap "Widgets" → find "Northstar"
3. Choose widget size (Small / Medium / Large)
4. Configure goal per widget instance

## Testing

- **Unit tests:** `npm test` (Jest, 50 tests covering date math + derived calculations)
- **E2E (Phase 2):** Maestro flows for create goal → check-in → milestone

## Architecture Notes

- **Offline-first:** All data in local SQLite. No network required.
- **Widget contract:** App writes JSON snapshot to shared storage. Widgets render from snapshot only (never query SQLite).
- **No streak freezes:** Progress reflects what the user actually did. No skip days, backdating, or excused misses.
- **Recovery tone:** Warm, steady, forward-looking. Never shame the user.

## Build Phases

- [x] **Phase 1:** Core + data (schema, CRUD, derived calcs, tests)
- [ ] **Phase 2:** Widgets (iOS WidgetKit + Android Glance)
- [ ] **Phase 3:** UI polish + motivation (animations, recovery flows, Live Activities)
- [ ] **Phase 4:** Extras (insights, health auto-log, routines, share cards)
- [ ] **Phase 5:** Growth stubs (sync, buddies, RevenueCat)

## TODO(owner)

- Bundle identifiers (iOS + Android)
- App Group ID
- App icon and store assets
- Non-smoking recovery timeline content
- Non-US support resources localization
- RevenueCat API keys (Phase 5)
- Backend URLs (Phase 5)
- Export mockup screenshots to `/docs/mockups/`