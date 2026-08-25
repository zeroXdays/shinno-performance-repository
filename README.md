# Shinno Lights

Apple-first controller for [Shinno Performance](https://shinnoperformance.com) RGB kits on Infiniti Q50 / Q60.

Lotus Lantern, Lotus Lamp X, and Magic Lantern treat these boxes as generic LED strips named `ELK-BLEDOM-XXXX`. This app treats them as one car: **emblem, mirrors, bumper, grille** — with vehicle scenes that write every zone in one tap.

The Bluetooth protocol is the same family documented by [dave-code-ruiz/elkbledom](https://github.com/dave-code-ruiz/elkbledom) (Home Assistant). Those boxes advertise as ELK-BLEDOM, ELK-BLEDOB, MELK, or LEDBLE.

## Why this instead of Lotus / Magic Lantern

- Zones are named after Shinno products, not factory serials
- **Sync all** — color, brightness, and scenes go to every paired box with a short stagger so BLE does not drop packets
- Vehicle scenes: Night drive, Infiniti red, OEM white, Show, Ice, Stealth
- Auto-reconnect on iOS after you walk away from the car
- No account, no ads
- iPhone is the real client. Safari cannot do Web Bluetooth; the native app in `ios/` is what you run on a phone

## Run the web garage (preview)

```bash
npm install
npm run dev
```

Opens at [http://127.0.0.1:43147](http://127.0.0.1:43147). First load builds a demo Q50 with four simulated controllers so you can drive the UI without hardware. Tap the car photo (emblem, grille, bumper, mirrors) to isolate a zone. The **Modes** tab uses Lotus Lamp X / Magic Lantern firmware animations as square tiles with a path of LEDs showing how each effect moves. Speed 0 is fast, 100 is slow — same as the ELK boxes.

Chrome on macOS or Android can also **Pair real box** via Web Bluetooth. iPhone Safari cannot; use the Xcode app.

```bash
npm test    # ELK frame encoding
npm run lint
```

## Run on iPhone

1. Open `ios/ShinnoLights.xcodeproj` in Xcode 15+
2. Select your development team under Signing
3. Plug in an iPhone and run **ShinnoLights**
4. Allow Bluetooth. Scan. Add each ELK box and assign Emblem / Mirrors / Bumper / Grille

Bundle id: `com.shinnoperformance.lights`

The iOS target uses CoreBluetooth, writes 9-byte ELK frames without response, and reconnects if a box drops.

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
- [RGB Bumper Lights](https://shinnoperformance.com/products/infiniti-q50-rgb-bumper-lights-2014-2024)
- [RGB Grille Badge](https://shinnoperformance.com/products/rgb-illuminated-q50-grille-badge-2014-2024)

If a kit shipped with a Magic Lantern / Lotus Lantern QR card, it belongs in this garage.
