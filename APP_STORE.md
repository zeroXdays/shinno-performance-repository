# App Store Connect — Shinno Lights

Paste-ready copy for the first iOS submission. Bundle ID: `com.shinnoperformance.lights`. Legal seller: **Shin No Performance LLC**. The in-app Privacy policy (Settings → Privacy policy) is the source of truth for this build.

This file is a helper. It does not submit the app. Zachary still completes App Store Connect, signing, screenshots, and review hardware.

## Listing

**Name:** Shinno Lights  
**Subtitle (30):** RGB controller for Q50 kits  
**Category:** Utilities  
**Age rating:** 4+ (no user-generated content; vehicle accessory)

**Description:**

Shinno Lights is the iPhone controller for Shinno RGB kits on Infiniti Q50 — emblem, mirrors, and bumper.

Power the lighting devices that shipped with your kits, allow Bluetooth, and the app scans for them. Add each device, assign a zone, then set color, brightness, power, and lighting modes. Speed 0 is slow, 100 is fast.

Q60 and Q70 are listed as soon and cannot be selected yet. Grille badge control is not in this version.

There is no account, no in-app shop, and no demo mode. Names, colors, and paired devices stay on this iPhone.

Questions: support@shinnoperformance.com

**Keywords (100 characters max):**  
`Shinno,lights,RGB,LED,Q50,emblem,bumper,mirror,Bluetooth,car`

**Support URL:** https://shinnoperformance.com  
**Marketing URL:** https://shinnoperformance.com  
**Privacy policy URL:** Host the text below at a public HTTPS URL (recommended: `https://shinnoperformance.com/privacy`). Until that page is live on the shop, you can deploy this repo and use `https://<your-host>/privacy`. App Review also checks Settings → Privacy policy inside the iOS app.

Do not upload mock or placeholder screenshots. Capture the real iPhone app on a device with kits powered: Color, Modes, Scan, Devices, and Settings/legal.

## Privacy policy (paste onto the site)

Shinno Lights is provided by Shin No Performance LLC. This policy describes how the iPhone app and the companion web controller handle information.

What the app does
Shinno Lights is a Bluetooth controller for Shinno RGB lighting kits on Infiniti Q50 — emblem, mirrors, and bumper. It finds nearby lighting devices and sends color, brightness, power, and mode commands over Bluetooth Low Energy. There is no account and no in-app shop.

Information stored on this device
Pairing names, Bluetooth identifiers of devices you add, zones you assign, last color, brightness, power, mode, and app settings stay in on-device storage (UserDefaults on iPhone, local storage in the browser). This information is used only to run the garage on this device. We do not upload it. We do not create an account. We do not sell information. We do not use analytics, advertising, or tracking SDKs. We do not collect precise location.

Bluetooth
Bluetooth is used only to discover, connect to, and control the lighting devices that ship with Shinno kits. We do not use Bluetooth to track you.

Feedback
If you email support@shinnoperformance.com, the content of that message and your email address are used only to respond and to improve the product.

Contact
Shin No Performance LLC
support@shinnoperformance.com
https://shinnoperformance.com

The in-app privacy policy is the source of truth for the current build.

## Review notes (App Review Information)

Shinno Lights is a native Bluetooth Low Energy controller for physical Shinno RGB kits. It is not a website wrapper. Reviewers need:

1. An iPhone with Bluetooth on.
2. Powered lighting devices from a Shinno Q50 kit. They advertise as ELK-BLEDOM, ELK-BLEDOB, MELK, or LEDBLE (Magic Lantern / Lotus Lamp X family). One device per kit: emblem, mirrors, bumper.
3. Allow the Bluetooth permission prompt. The app scans continuously while Bluetooth is on. Add each device on Scan, then assign the zone on Devices.
4. Color, brightness, power, and Modes write 9-byte frames to the devices. There is no login, no IAP, and no demo/simulator mode — the binary does nothing useful without the hardware.

The Chrome web controller in this repo is a companion for desktop only. Safari has no Web Bluetooth. Please review this iOS binary (`com.shinnoperformance.lights`), not the website.

Q60/Q70 rows in the car picker are intentionally disabled (labeled “soon”). Grille is not offered in this build.

If a device does not appear, confirm it is powered and within a few meters. Contact support@shinnoperformance.com if you need a hardware sample for review.

## Export compliance

Answer **No** — the app only uses encryption that is exempt (HTTPS if the system uses it, and standard Bluetooth). `ITSAppUsesNonExemptEncryption` is already `false` in Info.plist, so new uploads should skip the questionnaire after the first time.

## Age rating notes

- No user-generated content, no chat, no social features
- No account, no location tracking, no ads
- Car accessory: aftermarket lighting. Users must use lights legally and safely for driving
- Suggested 4+

## App Privacy (nutrition labels)

Data collected: **None** (nothing leaves the device unless the user emails support).  
Required reason API: UserDefaults `CA92.1` (app’s own settings and paired devices). Declared in `ios/ShinnoLights/PrivacyInfo.xcprivacy`.

## What you still do in Apple’s UI

1. Apple Developer team: open `ios/ShinnoLights.xcodeproj`, set Signing & Capabilities → Team (bundle `com.shinnoperformance.lights`).
2. Create the App Store Connect listing, paste the copy above, set support/marketing/privacy URLs.
3. Export compliance + age rating questionnaires.
4. App Privacy nutrition labels (no collected data).
5. Real device screenshots (6.7" and 6.1" required for iPhone). No mockups.
6. Attach review notes and have powered Q50 kits ready (or offer to ship a sample).
7. Archive in Xcode → Distribute to App Store Connect. This repo cannot submit for you.
