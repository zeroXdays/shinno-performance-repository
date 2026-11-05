# Shinno Sync

Apple-first controller from **Shin No Performance LLC** for [Shinno Performance](https://shinnoperformance.com) RGB kits on Infiniti **Q50** and **G37**. Q60 and Q70 are in the picker as “soon” and cannot be selected yet.

The garage holds **multiple vehicles** — Q50 and G37 can both be saved, switched in the header picker, and each keeps its own paired kits. Q50 uses **emblem, mirrors, bumper**. G37 is **emblem-only** until mirrors/bumper kits land. Grille badge support is in the code, commented out, until we have a kit to test. Paths and BLE writes always target the **active** car.

Devices advertise as ELK-BLEDOM, ELK-BLEDOB, MELK, or LEDBLE (Magic Lantern / Lotus Lamp X family). Pair the device, then assign the zone. Feedback: support@shinnoperformance.com.

The Bluetooth protocol is the same family documented by [dave-code-ruiz/elkbledom](https://github.com/dave-code-ruiz/elkbledom).

## Download and run (Bluetooth)

You need the git checkout of this repo (Cursor → this agent → **Open in Cursor**, or clone `main` locally). Node 20+ for the web app. Xcode 15+ for iPhone.

### Fastest: Chrome on a Mac (Web Bluetooth)

Safari and Firefox cannot talk to the devices. Use **Google Chrome** (or Edge) on a computer with Bluetooth.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43147](http://127.0.0.1:43147) in Chrome — localhost is allowed without HTTPS.

1. Power the devices that shipped with the kits.
2. Open **Scan** and tap **Add a device**. Chrome’s Bluetooth chooser appears.
3. Pick a device. On **Devices**, name it and set the zone (Emblem / Mirrors / Bumper).
4. Repeat for the other kits. Color, brightness, and modes then write to the hardware.

The app unlocks with a **paid Shopify order number + checkout email** (`POST /api/verify-purchase`). See [`appstore/SHOPIFY_UNLOCK.md`](appstore/SHOPIFY_UNLOCK.md) and `.env.example`.

Names, colors, and last link stay in local storage. The gear in the header opens **Settings**: add and connect automatically, remember devices, Night / Graphite / Studio themes, English or Spanish (system language by default), how-to-use, privacy policy, user agreement, updates, and feedback. Rename devices on **Devices**, and use **Remove** to drop a paired device.

### iPhone (the real client)

iOS Safari has no Web Bluetooth. Pairing on a phone means the native app:

1. Open `ios/ShinnoLights.xcodeproj` in Xcode.
2. Signing & Capabilities → your Apple ID / team (bundle `com.shinnoperformance.lights`).
3. Plug in an iPhone, pick it as the run destination, hit Run.
4. Allow Bluetooth when prompted. The app keeps scanning for nearby devices and adds them as they appear.

CoreBluetooth writes 9-byte frames without response and reconnects if a device drops.

Settings (gear) includes how to use, privacy policy, user agreement, and feedback to support@shinnoperformance.com.

App Store Connect paste copy and the remaining Apple UI checklist: [`APP_STORE.md`](APP_STORE.md). Privacy policy is also at `/privacy` when this web app is hosted.

```bash
npm test    # frame encoding
npm run lint
```

## Protocol

Writes go to characteristic `0000fff3-0000-1000-8000-00805f9b34fb` (or `ffe1` on LEDBLE). Frames are 9 bytes, `7E … EF`.

| Action | Typical frame |
| --- | --- |
| Power on | `7E 04 04 F0 00 01 FF 00 EF` |
| Power off | `7E 04 04 00 00 00 FF 00 EF` |
| Color | `7E 07 05 03 RR GG BB 0A EF` |
| Brightness 0–100 | `7E 04 01 II 01 FF 02 01 EF` |

Mode speed in the UI is **0 slow / 100 fast**. The firmware byte is inverted (0 = fastest).

Model-specific variants live in `src/lib/protocol/models.ts` and `ios/ShinnoLights/BLE/ElkProtocol.swift`.

## Shinno kits this is built for

- [RGB LED Emblem](https://shinnoperformance.com/products/infiniti-q50-rgb-led-emblem-2014-2024)
- [RGBW Side Mirror Lights](https://shinnoperformance.com/products/rgbw-side-mirror-lights-for-infiniti-q50-2014-2024)
- [RGB Bumper Lights](https://shinnoperformance.com/products/infiniti-q50-rgb-bumper-lights)
- RGB Grille Badge — parked in the UI until we have a kit to test (`src/lib/catalog.ts`)

If a kit shipped with a Magic Lantern / Lotus Lantern QR card, it belongs in this garage. Q60 / Q70 are not wired yet. Switch cars in the header to manage Q50 and G37 side by side.
