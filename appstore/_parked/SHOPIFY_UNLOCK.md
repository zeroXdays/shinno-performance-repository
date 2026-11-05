# Purchase unlock (Shopify)

Shinno Sync stays locked until the customer enters a **paid Shopify order number + checkout email**. The server checks Shopify Admin API and unlocks on-device.

## How confirmation works

1. Customer buys a Shinno kit on your Shopify store.
2. In the app they enter order `#1001` (or `1001`) and the email from the receipt.
3. `POST /api/verify-purchase` looks up that order with your Admin API token.
4. Unlock succeeds only if:
   - email matches the order
   - order is paid (or authorized / partially paid)
   - order is not cancelled
   - line items / tags look like a Shinno product (configurable)
5. Phone stores unlock locally. No Shopify login password is required.

## What you must set up

1. Deploy this Next.js app (or at least the API) to HTTPS — e.g. Vercel — so iOS can call it.
2. Shopify Admin → **Settings → Apps and sales channels → Develop apps** → Create app → allow **`read_orders`** → Install → copy Admin API token.
3. Copy `.env.example` to `.env.local` (or host env vars):

```
SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...
SHOPIFY_PRODUCT_NEEDLE=shinno
APP_REVIEW_ORDER=REVIEW
APP_REVIEW_EMAIL=review@shinnoperformance.com
```

4. Point iOS `ShinnoLicenseAPIURL` in Info.plist at `https://<your-host>/api/verify-purchase` (default is `https://shinnoperformance.com/api/verify-purchase`).

## App Review

Apple requires a way to open gated apps. Put in review notes:

```
Unlock with order REVIEW and email review@shinnoperformance.com
(configured via APP_REVIEW_* on the unlock API). Physical BLE kits are still required to control lights.
```

## Demo devices

Removed for upload mode. Do not re-add fake BLE seeds to the App Store binary.
