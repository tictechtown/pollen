# Pollen

A React Native RSS reader built with Expo and React Native Paper, optimized for Android and Material You.

## Features

- Material You / Material 3 UI (React Native Paper)
- Feed reading with local persistence
- Reader mode extraction (Mozilla Readability)
- Expo Router navigation

## Tech stack

- Expo + React Native
- React Native Paper (Material 3)
- SQLite (via `expo-sqlite`)

## Getting started

### Prerequisites

- Node.js (recommended: Node 20)
- npm (recommended: the version from `packageManager` in `package.json`)
- For Android dev/builds: Android Studio + Android SDK

### Install

```bash
npm ci
```

### Run (development)

```bash
npm run start
```

Then choose a target:

- Android: `npm run android`
- iOS: `npm run ios`
- Web: `npm run web`

## Scripts

- `npm run lint` — lint
- `npx prettier .` — run Prettier checks
- `npm test` — run tests
- `npm run typecheck` — run TypeScript checks

## Build Android release APK

Local build:

```bash
npm run build:android:release
```

APK output will be under `android/app/build/outputs/apk/release/`.

### GitHub Actions (manual)

This repo includes a manually triggered workflow that builds an Android release APK and uploads it as an artifact:

- Workflow: `.github/workflows/build-android-release.yml`
- Download: GitHub → Actions → “Build Android Release APK” → run → artifacts (`android-release-apk`)

Note: release signing is not configured by default. For Play Store distribution, you’ll need to add a keystore + signing config and wire secrets into the workflow.

## Notes for contributors

- This project uses Expo Router.
- The native folders (`android/` and `ios/`) are generated via `expo prebuild` for native builds, and are not committed.
- No environment variables are required by default. If you add any, prefer documenting them and providing a `.env.example` (never commit real secrets).

## Contributing

Issues and PRs are welcome:

- Use GitHub Issues for bugs and feature requests.
- For changes, please include a clear description and, when relevant, tests.

## Roadmap

See `TODO.md`.

## Security

If you believe you’ve found a security issue, please open a GitHub Security Advisory or contact the maintainer privately.

## License

MIT License. See `LICENSE`.
