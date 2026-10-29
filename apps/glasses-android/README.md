# TaskLens Glasses companion (P0-6)

Thin native companion for the hands-free loop. **Mock Device Kit build — no real
glasses integration is claimed.** The UI always shows the capture source
("sample (mock)"), and the mock capture is a bundled synthetic photo
(`app/src/main/res/raw/sample_leak.jpg`), never empty bytes.

## Flow

"Fix this" → capture → `POST {baseUrl}/api/glasses/upload` (same scan pipeline
as the phone flow) → summary spoken on the phone speaker (TTS) → "Open quote"
deep link (`/book/[scanId]`).

Auth is the USER's credential, never a shared secret:
- against a demo server, enter `demo:customer` (sent as the demo cookie);
- against production, paste the user's Supabase JWT (sent as Bearer).

## Build (needs JDK 17 + Android SDK — not present in this env)

```sh
cd apps/glasses-android
gradle wrapper --gradle-version 8.11.1   # generates gradle/wrapper/ (uncommitted)
./gradlew assembleDebug
```

Open in Android Studio if you prefer; add `sdk.dir=/path/to/sdk` to a local
`local.properties` (never commit it). Before submitting, raise
`compileSdk`/`targetSdk` to whatever Play Console requires (docs beat the code).

## Wiring real glasses (Meta Wearables Device Access Toolkit)

1. Get toolkit access via the Meta Wearables Developer Center.
2. Pair through the Meta AI app (the toolkit's documented flow).
3. Implement `WearablesDeviceKit.capturePhoto()` with the toolkit's capture call
   (Bluetooth-mic audio for voice notes; TTS stays on the phone speaker).
4. Flip `DeviceProvider.USE_WEARABLES` to true and reinstall.

Distribution for tester builds goes through the Meta Wearables Developer Center
release channel — never the Play store listing (the store build is the TWA in
`apps/android-twa` and contains no glasses code).
