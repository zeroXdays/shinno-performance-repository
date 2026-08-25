# Shinno Lights

Apple-first controller for [Shinno Performance](https://shinnoperformance.com) RGB kits on Infiniti **Q50**. Q60 and Q70 are in the picker as “soon” and cannot be selected yet.

Lotus Lantern, Lotus Lamp X, and Magic Lantern treat these boxes as generic LED strips named `ELK-BLEDOM-XXXX`. This app treats them as one car: **emblem, mirrors, bumper, grille**.

The Bluetooth protocol is the same family documented by [dave-code-ruiz/elkbledom](https://github.com/dave-code-ruiz/elkbledom). Those boxes advertise as ELK-BLEDOM, ELK-BLEDOB, MELK, or LEDBLE.

## Download and run (Bluetooth)

You need the git checkout of this repo (Cursor → this agent → **Open in Cursor**, or clone `main` locally). Node 20+ for the web app. Xcode 15+ for iPhone.

### Fastest: Chrome on a Mac (Web Bluetooth)

Safari and Firefox cannot talk to the boxes. Use **Google Chrome** (or Edge) on a computer with Bluetooth.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43147](http://127.0.0.1:43147) in Chrome — localhost is allowed without HTTPS.

1. Power the ELK boxes that shipped with the kits (they show up as `ELK-BLEDOM…`, `MELK…`, or `LEDBLE…`).
2. In the app, open **Scan** → **Pair**. Chrome’s Bluetooth chooser appears.
3. Pick a box. On **Devices**, name it and set the zone (Emblem / Mirrors / Bumper / Grille).
4. Repeat for the other three boxes. Color, brightness, and modes then write to the real hardware.

The first load also seeds a demo garage so you can click around with no boxes. **Demo scan** adds simulated controllers only — use **Pair** for live Bluetooth.

### iPhone (the real client)

iOS Safari has no Web Bluetooth. Pairing on a phone means the native app:

1. Open `ios/ShinnoLights.xcodeproj` in Xcode.
2. Signing & Capabilities → your Apple ID / team (bundle `com.shinnoperformance.lights`).
3. Plug in an iPhone, pick it as the run destination, hit Run.
4. Allow Bluetooth when prompted. Scan, add each ELK box, assign zones.

CoreBluetooth writes 9-byte ELK frames without response and reconnects if a box drops.

```bash
npm test    # ELK frame encoding
npm run lint
```

## Protocol (ELK-BLEDOM)

Writes go to characteristic `0000fff3-0000-1000-8000-00805f9b34fb` (or `ffe1` on LEDBLE). Frames are 9 bytes, `7E … EF`.

| Action | Typical frame |
| --- | --- |
| Power on | `7E 04 04 F0 00 01 FF 00 EF` |
| Power off | `7E 04 04 00 00 00 FF 00 EF` |
| Color | `7E 07 05 03 RR GG BB 0A EF` |
| Brightness 0–100 | `7E 04 01 II 01 FF 02 01 EF` |

Model-specific variants (BLEDOB, MELK, LEDBLE) live in `src/lib/protocol/models.ts` and `ios/ShinnoLights/BLE/ElkProtocol.swift`.

## Shinno kits this is built for

- [RGB LED Emblem](https://shinnoperformance.com/products/infiniti-q50-rgb-led-emblem-2014-2024)
- [RGBW Side Mirror Lights](https://shinnoperformance.com/products/rgbw-side-mirror-lights-for-infiniti-q50-2014-2024)
- [RGB Bumper Lights](https://shinnoperformance.com/products/infiniti-q50-rgb-bumper-lights)
- [RGB Grille Badge](https://shinnoperformance.com/products/rgb-illuminated-q50-grille-badge-infiniti-q50-2014-2024)

If a kit shipped with a Magic Lantern / Lotus Lantern QR card, it belongs in this garage. Q60 / Q70 product photos are not wired yet.
