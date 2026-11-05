# Shinno Sync — App Store readiness

**Verdict: almost ready for App Store review — not a one-click upload from this cloud machine.**

The native iOS app (`ios/`) is the binary Apple reviews. It has no demo/simulator mode, uses CoreBluetooth only, includes privacy/legal screens, App Privacy manifest, export-compliance flag, 1024×1024 icon, and display name **Shinno Sync**. Version **1.0 (1)**, bundle `com.shinnoperformance.lights`.

This environment is Linux. Apple only accepts a **signed** build from macOS. There is no IPA here you can drag into App Store Connect — but you **do not need to own a Mac**. Use cloud Mac CI (Codemagic) or rent/borrow a Mac. See [`NO_MAC.md`](NO_MAC.md).

## What’s ready in the repo

| Item | Status |
| --- | --- |
| Native iOS project | Ready — `ShinnoSync-iOS-1.0.zip` in this folder |
| Display name Shinno Sync | Ready |
| Bundle ID | `com.shinnoperformance.lights` |
| BLE usage strings | Ready |
| PrivacyInfo.xcprivacy | Ready (no tracking; UserDefaults CA92.1) |
| ITSAppUsesNonExemptEncryption = false | Ready |
| In-app Privacy / Agreement / How-to | Ready |
| App Store Connect paste copy | Ready — `listing.txt`, `review-notes.txt`, `privacy-policy.txt` |
| Demo devices | **Web preview only** — not in the iOS binary |

## What you still must do on a Mac / Apple’s site

1. Apple Developer Program membership + App Store Connect app record.
2. Open the Xcode project → set **Signing Team** (empty in the zip on purpose).
3. Archive → Distribute App → App Store Connect (this creates the uploadable build).
4. Host `privacy-policy.txt` at a public HTTPS URL (e.g. `https://shinnoperformance.com/privacy`).
5. Capture real iPhone screenshots (6.7" and 6.1") with kits powered — no mockups.
6. Paste listing + review notes; set App Privacy to **Data Not Collected**.
7. Have powered Shinno kits available for App Review (or offer to ship a sample).

- No personal Mac: [`NO_MAC.md`](NO_MAC.md) + root [`codemagic.yaml`](../codemagic.yaml)
- Own/borrow a Mac: [`UPLOAD.md`](UPLOAD.md)

## Web app note

`http://127.0.0.1:43147` is a Chrome/Web Bluetooth preview. It is **not** what Apple reviews. The “Add demo devices” control is web-only and must stay out of the App Store binary (it already is).
