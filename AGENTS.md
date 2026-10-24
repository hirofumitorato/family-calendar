This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## This project (かぞくカレンダー)

- Requirements & TODO: `docs/REQUIREMENTS.md`. UI text is Japanese.
- Screens only talk to `CalendarRepository` (`src/data/repository.ts`). Any new data operation must be added to the interface AND both implementations (`demo-repository.ts`, `supabase-repository.ts`). The app runs in demo mode when `EXPO_PUBLIC_SUPABASE_*` is unset.
- Pure logic lives in `src/lib/` with no `@/` imports so `npm test` (node --experimental-strip-types) can run it. Add tests in `tests/` for any change there.
- DB changes go in a new file under `supabase/migrations/`; keep RLS: `personal` calendars are visible only to `owner_id`, `family` calendars to all family members.
- Weather: Open-Meteo via `supabase/functions/fetch-weather` → `weather_daily`. The app never calls Open-Meteo directly.
- Never call `Alert.alert` directly — it is a no-op on web. Use `notify` / `confirm` from `src/utils/dialog.ts`.
- Colors come from `useTheme()`; the light/dark choice lives in `src/state/theme.tsx` (user setting), not the OS directly.
- Inputs must never sit under the software keyboard: in scroll forms use `useKeyboardFocusScroll` (`src/hooks/use-keyboard-focus-scroll.ts`) on every TextInput; put modal editors with inputs at the top of the screen, not in bottom sheets.
- Before finishing: `npm run typecheck && npm test`.
