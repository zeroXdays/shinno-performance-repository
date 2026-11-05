export const LEGAL_NAME = "Shin No Performance LLC";
export const SUPPORT_EMAIL = "support@shinnoperformance.com";
export const SITE_URL = "https://shinnoperformance.com";
export const PRODUCT_NAME = "Shinno Sync";

export const PRIVACY_TITLE = "Privacy policy";

/** Same text as ios/ShinnoLights/LegalCopy.swift — paste into App Store Connect. */
export const PRIVACY_BODY = `Shinno Sync is provided by Shin No Performance LLC. This policy describes how the iPhone app handles information.

What the app does
Shinno Sync is a Bluetooth controller for Shinno RGB lighting kits on Infiniti Q50 and G37 — emblem, mirrors, and bumper. It finds nearby lighting devices and sends color, brightness, power, and mode commands over Bluetooth Low Energy. There is no in-app shop. Features unlock after you confirm a paid Shopify order for a Shinno kit.

Purchase verification
To unlock the app you enter your Shopify order number and the email used at checkout. That pair is sent to our unlock service, which checks your order in Shopify and returns only a yes/no result. We do not create a customer login. After unlock, the order number and email stay on this device so you do not re-enter them. You can unlink the purchase in Settings.

Information stored on this iPhone
Pairing names, Bluetooth identifiers of devices you add, zones you assign, last color, brightness, power, mode, app settings, and your unlock record stay in on-device storage. Garage data is used only to run the lights on this phone. We do not sell information. We do not use analytics, advertising, or tracking SDKs. We do not collect precise location.

Bluetooth
Bluetooth is used only to discover, connect to, and control the lighting devices that ship with Shinno kits. We do not use Bluetooth to track you.

Feedback
If you email support@shinnoperformance.com, the content of that message and your email address are used only to respond and to improve the product.

Contact
Shin No Performance LLC
support@shinnoperformance.com
https://shinnoperformance.com

The in-app privacy policy is the source of truth for this build.`;

export const TERMS_TITLE = "User agreement";

export const TERMS_BODY = `Shinno Sync is a controller for Shinno RGB kits you already own. It is provided by Shin No Performance LLC.

You are responsible for using vehicle lights in a way that is legal and safe for driving in your location. Do not use flashing or colored lights in a way that imitates emergency vehicles or violates local law.

The app requires a physical Shinno lighting kit, a paid Shopify order from Shin No Performance LLC to unlock, and Bluetooth. Q50 and G37 emblem, mirror, and bumper kits are supported. Q60 and Q70 appear in the car picker as soon and cannot be selected yet. Grille badge support is not offered in this build.

The app is provided as-is, without warranties. Hardware pairing and lighting behavior depend on the devices that shipped with your kits.

Questions: support@shinnoperformance.com`;

export const HOWTO_TITLE = "How to use Shinno Sync";

export const HOWTO_BODY = `1. Unlock Shinno Sync with your Shopify order number and the email from checkout.
2. Power the lighting devices that shipped with your Shinno RGB kits (emblem, mirrors, bumper).
3. Turn Bluetooth on. Shinno Sync scans continuously while Bluetooth is on and lists nearby devices on Scan.
4. Open Scan and tap Add on each device. Allow Bluetooth the first time iOS asks.
5. After that, Shinno Sync reconnects saved devices when they power on and restores the last color and mode. You do not rescan every time.
6. Color sets a solid RGB for all lights or one zone. Modes run the lighting animations. Speed 0 is slow, 100 is fast.
7. Remove a device anytime from Devices.

This iPhone app talks to the hardware over Bluetooth. Lights must be used in a way that is legal and safe for driving.`;
