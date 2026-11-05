# Upload Shinno Sync to App Store Connect (Mac)

You need: Mac + Xcode 15+, Apple Developer account, powered Shinno kits for screenshots/review.

## 1. Open the project

1. Download / unzip `ShinnoSync-iOS-1.0.zip` (same as repo `ios/` folder).
2. Open `ShinnoLights.xcodeproj` in Xcode.
3. Select the **ShinnoLights** target → **Signing & Capabilities**.
4. Check **Automatically manage signing**.
5. Choose your **Team**. Leave bundle ID `com.shinnoperformance.lights` unless Apple already issued a different one you must match.

## 2. Create the App Store Connect listing

1. [App Store Connect](https://appstoreconnect.apple.com) → My Apps → **+** → New App.
2. Platforms: iPhone. Name: **Shinno Sync**. Bundle ID: `com.shinnoperformance.lights`.
3. Paste fields from `listing.txt`.
4. Privacy policy URL: host `privacy-policy.txt` on HTTPS first, then paste that URL.
5. App Privacy: **Data Not Collected**.
6. Export compliance: **No** (non-exempt encryption) — Info.plist already declares this.
7. Age rating: follow `APP_STORE.md` notes (suggest 4+).
8. Paste `review-notes.txt` into App Review Information notes. Contact: support@shinnoperformance.com.

## 3. Screenshots

On a physical iPhone with kits powered, capture Color, Modes (Paths), Scan, Devices, Settings. Required sizes typically include **6.7"** and **6.1"** iPhone. No web mockups.

## 4. Archive and upload the binary

1. In Xcode, set run destination to **Any iOS Device (arm64)**.
2. Product → **Archive**.
3. Organizer → **Distribute App** → **App Store Connect** → Upload.
4. Wait for processing in App Store Connect → select the build → Submit for Review.

Optional: after Archive, export an IPA and upload with **Transporter** — same result.

## 5. Submit

Fill missing questionnaire items, attach screenshots, submit. Apple needs Bluetooth hardware to exercise the app; there is no login or demo account.
