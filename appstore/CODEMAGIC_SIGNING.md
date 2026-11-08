# Codemagic signing — no Mac CSR needed

Apple’s website asks for a **Certificate Signing Request** only if you create a certificate **by hand**. With Codemagic you should **not** do that on developer.apple.com.

## Required: `CERTIFICATE_PRIVATE_KEY`

Automatic signing needs a **persistent** 2048-bit RSA private key. Without it, `fetch-signing-files --create` makes a throwaway distribution certificate whose key dies with the build VM. The next build then fails with:

```text
Cannot save Signing Certificates without certificate private key
```

### Add it once in Codemagic

1. Codemagic → your app → **Environment variables** → group **`appstore`**
2. Add secure variable:
   - **Name:** `CERTIFICATE_PRIVATE_KEY`
   - **Value:** full PEM including the header/footer lines  
     (`-----BEGIN RSA PRIVATE KEY-----` … `-----END RSA PRIVATE KEY-----`)
3. Save. Start a **new** build (don’t retry the failed one).

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

### `APP_STORE_APPLE_ID=$APP_STORE_APPLE_ID` in the build log

Delete that variable from the env group, or set it to digits only (`6830956380`).
