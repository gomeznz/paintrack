# PainTrack mobile app

Expo (React Native) app for iOS and Android. This first version is
**local-only**: everything stays on the phone.

## What it does

- **Log pain**: tap areas on a front/back body map, set 0–10 intensity and
  what it feels like for each area, an overall score and optional notes.
- **Log medication**: name, strength, amount and unit, route, and when it was
  taken. Recently used medications are one tap away.
- **History**: entries grouped by day, newest first. Long-press to delete.
- **Reminders**: optional daily check-ins with generic wording.

## Security

| Protection | How |
|---|---|
| Encrypted storage | SQLCipher database (`expo-sqlite` with `useSQLCipher`). The app refuses to store anything if encryption isn't compiled in. |
| Key handling | Random 256-bit key in the iOS Keychain / Android Keystore, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`: never backed up, never leaves the device. |
| App lock | Face ID / fingerprint / device passcode on launch and after a configurable time in the background. While locked the database is closed and no screens are mounted. |
| Device security required | The app won't open on a phone with no screen lock. |
| App switcher | Content is covered as soon as the app goes inactive. |
| Backups | Android auto-backup disabled. On iOS a backed-up database file is unreadable without the device-only key; on a restored phone the app offers a fresh start. |
| Notifications | Fixed generic text ("Time for a quick check-in"); Android lock-screen visibility set to private. |
| Validation | Every record is checked against the shared schema when saved and again when read. |
| No third parties | No analytics, ads, crash reporting or other SDKs that send data off the device. |

**Known limitation:** with no backup yet, deleting the app or losing the phone
loses the entries. Encrypted backup/sync (using `packages/core`) comes next.

## Running it

SQLCipher, Face ID and secure storage are native modules, so the app needs a
**development build**. Expo Go won't work.

```sh
pnpm install                     # from the repo root
cd apps/mobile
npx expo run:ios                 # needs a Mac with Xcode
npx expo run:android             # needs Android Studio
```

Or build in Expo's cloud (EAS) with no Xcode or Android Studio, using the
profiles in `eas.json`:

```sh
npx eas-cli@latest login                                        # free Expo account
npx eas-cli@latest build --profile preview --platform android   # installable APK
npx eas-cli@latest build --profile ios-simulator --platform ios # for the iOS Simulator on a Mac
```

`ios.bundleIdentifier` and `android.package` in `app.json` are set to
`nz.paintrack.app` as a placeholder; change them to an identifier you own
before your first store build.

## Checks

```sh
pnpm typecheck
pnpm test        # storage (real SQLite), body map geometry, lock policy, formatting
```
