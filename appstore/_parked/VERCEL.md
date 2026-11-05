# Deploy Shinno Sync unlock API on Vercel

## Important: which Shopify secret

| Shopify field | Use it? |
| --- | --- |
| **Admin API access token** (`shpat_...`) | **Yes** → `SHOPIFY_ADMIN_ACCESS_TOKEN` |
| Client ID / API key | No |
| Client secret / API secret key | No |

Reveal the Admin token on the custom app **API credentials** page after **Install app**.

## 1. Push this repo to GitHub

If it isn’t on GitHub yet, create a repo and push `main`.

## 2. Import on Vercel

1. Go to [vercel.com](https://vercel.com) → sign in with GitHub.
2. **Add New…** → **Project** → import this repo.
3. Framework Preset: **Next.js** (auto).
4. Root Directory: leave blank (repo root).
5. **Do not deploy yet** — add env vars first (or add them and redeploy).

## 3. Environment variables

Project → **Settings** → **Environment Variables** → add for **Production** (and Preview if you want):

| Name | Value |
| --- | --- |
| `SHOPIFY_SHOP_DOMAIN` | `your-store.myshopify.com` (no `https://`) |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | `shpat_...` from Shopify |
| `SHOPIFY_PRODUCT_NEEDLE` | `shinno` |
| `APP_REVIEW_ORDER` | `REVIEW` |
| `APP_REVIEW_EMAIL` | `review@shinnoperformance.com` |

## 4. Deploy

**Deployments** → redeploy latest, or push a commit. Wait until status is Ready.

Your unlock URL will be:

`https://YOUR-PROJECT.vercel.app/api/verify-purchase`

Optional: add a custom domain in Vercel (e.g. `sync.shinnoperformance.com`) and point DNS.

## 5. Point the iOS app at it

In `ios/ShinnoLights/Info.plist`, set `ShinnoLicenseAPIURL` to:

`https://YOUR-PROJECT.vercel.app/api/verify-purchase`

(or your custom domain). Rebuild/upload the iOS app after changing this.

## 6. Smoke test

```bash
curl -s -X POST https://YOUR-PROJECT.vercel.app/api/verify-purchase \
  -H 'Content-Type: application/json' \
  -d '{"orderNumber":"REVIEW","email":"review@shinnoperformance.com"}'
```

Expect: `{"ok":true,...}`

Then test a real paid order number + checkout email from Shopify.

## 7. App Review notes

```
Unlock with order REVIEW and email review@shinnoperformance.com
```
