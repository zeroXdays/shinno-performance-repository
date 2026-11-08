# Codemagic signing — no Mac CSR needed

Apple’s website asks for a **Certificate Signing Request** only if you create a certificate **by hand**. With Codemagic you should **not** do that.

## Correct path (recommended)

1. Make sure GitHub `main` has the latest `codemagic.yaml` (the one that runs `app-store-connect fetch-signing-files … --create`).
2. In Codemagic, env group `appstore` must include `APPLE_TEAM_ID`.
3. App Store Connect integration must be named **`shinno`** and use an API key with **App Manager** (or Admin) access.
4. Start a **new** build. Codemagic creates the distribution certificate + App Store profile itself. No CSR upload.

## Re-uploads / “Publishing failed”

Apple rejects an IPA when `CFBundleVersion` (build number) was already used. `codemagic.yaml` now bumps that automatically from the latest TestFlight / App Store build before each IPA. If publish still fails, open the Codemagic build log → **Publishing** step and read the Apple error line (duplicate build, missing compliance, bad API key, etc.).

### `APP_STORE_APPLE_ID=$APP_STORE_APPLE_ID` in the build log

That means the env var never resolved to the numeric Connect app id. In Codemagic → Environment variables → group `appstore`, either:

- delete `APP_STORE_APPLE_ID` (the workflow defaults to `6830956380`), or
- set it to the digits only (e.g. `6830956380`) — never `$APP_STORE_APPLE_ID`.

Then start a **new** build (don’t retry the failed one).

## If you already started a manual certificate on Apple’s site

Cancel/back out. Don’t finish it. Let Codemagic create signing files instead.

## Manual CSR (only if Codemagic --create still fails)

A CSR file can be generated on Linux/Windows with OpenSSL (no Mac required). Prefer fixing Codemagic first.

Never commit the `.key` private key to GitHub.
