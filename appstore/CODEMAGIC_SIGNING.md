# Codemagic signing — no Mac CSR needed

Apple’s website asks for a **Certificate Signing Request** only if you create a certificate **by hand**. With Codemagic you should **not** do that on developer.apple.com.

## Required: `CERTIFICATE_PRIVATE_KEY`

Automatic signing needs a **persistent** 2048-bit RSA private key. Without it, `fetch-signing-files --create` makes a throwaway distribution certificate whose key dies with the build VM. The next build then fails with:

```text
Cannot save Signing Certificates without certificate private key
```

### Create group `appstore` first (or you’ll see “unknown variable group”)

`codemagic.yaml` imports group **`appstore`**. Codemagic will refuse to start if that group does not exist yet:

```text
Codemagic.yaml references to unknown variable group(s): appstore
```

There is **no** empty group list and no separate “New group” button. You create the group by adding the first variable:

1. Codemagic → open the **Shinno** / GitHub app → **Environment variables** tab  
   (app settings — not Teams → Integrations)
2. Fill the form:
   - **Variable name:** `CERTIFICATE_PRIVATE_KEY`
   - **Variable value:** paste the full PEM including  
     `-----BEGIN RSA PRIVATE KEY-----` … `-----END RSA PRIVATE KEY-----`
   - **Group:** type exactly `appstore` (lowercase, no spaces — must match yaml)
   - Enable **Secret**
3. Click **Add** — that creates group `appstore`
4. Confirm the page now shows group **appstore**
5. **Then** start a new build

Keep reusing this same key for every Shinno build. Do **not** generate a new key per build (Apple caps distribution certificates at ~3).

### Generate your own key (optional)

```bash
ssh-keygen -t rsa -b 2048 -m PEM -f ios_distribution_private_key -q -N ""
# paste the contents of ios_distribution_private_key into CERTIFICATE_PRIVATE_KEY
```

## Rest of the setup

1. GitHub `main` has the latest `codemagic.yaml` (uses `--certificate-key="@env:CERTIFICATE_PRIVATE_KEY"`).
2. App Store Connect integration named **`shinno`** (App Manager or Admin API key).
3. Optional in group `appstore`: `APPLE_TEAM_ID`.  
   `APP_STORE_APPLE_ID` defaults to `6830956380` in `codemagic.yaml`.

## If you already created a cert by hand on Apple’s site

1. Prefer **not** finishing a manual CSR on developer.apple.com.
2. If you already have orphan distribution certs and hit Apple’s limit when Codemagic tries `--create`, revoke an unused **Apple Distribution** certificate you don’t have the key for, then re-run the build with `CERTIFICATE_PRIVATE_KEY` set.
3. Never commit `.p12` / `.key` / PEM private keys to GitHub.

## Re-uploads / “Publishing failed”

Apple rejects an IPA when `CFBundleVersion` was already used. `codemagic.yaml` bumps that from TestFlight / App Store before each IPA. If publish still fails, open the Codemagic **Publishing** step and read the Apple error line.

### “Post-process failed” (Magic Actions)

Codemagic uploads the IPA first, then a separate **post-process** job waits for Apple to finish processing so it can submit to TestFlight. That wait fails when:

1. **Xcode 26 altool** uploaded with the wrong / unresolved Apple ID — fixed in `codemagic.yaml` via  
   `APP_STORE_CONNECT_ALTOOL_ADDITIONAL_ARGUMENTS=--apple-id 6830956380 --use-old-altool`
2. **Apple rejected the binary** — check the App Store Connect email (duplicate build, Invalid Swift Support, etc.). The build never appears, so Magic Actions times out at ~15 minutes.
3. **ASC is just slow** — the IPA may still show up later under TestFlight → iOS builds.

Current workflow sets `submit_to_testflight: false` so upload success is not blocked by Magic Actions. After a green Publishing step, open **App Store Connect → TestFlight**; the build should appear once Apple finishes processing (often a few minutes). Add yourself as an Internal Tester there if needed.

### `APP_STORE_APPLE_ID=$APP_STORE_APPLE_ID` in the build log

Delete that variable from the env group, or set it to digits only (`6830956380`).
