# Why TestFlight still shows identical rainbow modes

Codemagic builds from **GitHub**:

`https://github.com/zeroXdays/shinno-performance-repository`

This Cursor agent pushes to **Origin** only:

`https://origin.cursor.com/zachary-brown/shinno-performance-control`

Those are **not** the same remote (`mirrorStatus: no-mirror`). So glyph fixes land on Origin and never reach TestFlight until GitHub `main` is updated.

As of the last check:

| Remote | Tip | Mode glyphs |
| --- | --- | --- |
| Origin `main` | includes build‑21 distinct ModeGlyph + fixed palettes | Correct |
| GitHub `main` | `5814b56` (build 11) | Old identical rainbow tiles |

## Fix (you run this — agent has no GitHub login)

From a machine logged into GitHub as someone with push on `zeroXdays/shinno-performance-repository`:

```bash
git clone https://origin.cursor.com/zachary-brown/shinno-performance-control.git
cd shinno-performance-control
git remote add github https://github.com/zeroXdays/shinno-performance-repository.git
git push github main
```

If GitHub rejects a non‑fast‑forward (histories diverged):

```bash
git push github main --force
```

Then in [Codemagic](https://codemagic.io) → **Shinno Sync → App Store Connect** → Start new build.

When the phone has the new build, Modes shows:

`Preview build 21 · colours match each mode name`

If that line is missing, TestFlight is still on the old IPA.

## “Post process failed for shinno-performance-repository”

That usually means Codemagic finished the Xcode step but **publishing / post‑process** failed (App Store Connect upload, duplicate `CFBundleVersion`, signing, or API key). Open the failed build → **Publishing** (or Post-processing) log and read the Apple/Codemagic error line.

`codemagic.yaml` already bumps `CFBundleVersion` from TestFlight/App Store before each IPA. If publish still fails, it is almost always credentials, agreement, or compliance — not the Swift mode glyphs.

## Optional: give the agent GitHub push

Add a classic PAT with `repo` scope as a Cursor secret named `GITHUB_TOKEN`, then ask the agent to push Origin `main` to `zeroXdays/shinno-performance-repository`.
