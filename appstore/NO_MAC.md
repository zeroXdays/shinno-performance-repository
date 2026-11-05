# No Mac? How to get Shinno Sync on the App Store

Apple only accepts **signed iOS builds made on macOS**. You do **not** need to own a Mac — you rent cloud Mac time (or borrow one) just to build and upload.

You **do** need an [Apple Developer Program](https://developer.apple.com/programs/) membership (~$99/year). That is required for every App Store app.

## Best path: Codemagic (cloud Mac)

This repo includes [`codemagic.yaml`](../codemagic.yaml) at the root.

1. Create the App Store Connect app for bundle `com.shinnoperformance.lights` (paste copy from `listing.txt`).
2. Host `privacy-policy.txt` on HTTPS and set that URL in Connect.
3. Create an **App Store Connect API key**  
   App Store Connect → Users and Access → Integrations → App Store Connect API → Generate.  
   Download the `.p8` once; note Key ID + Issuer ID.  
   Also copy your **Team ID** from [developer.apple.com](https://developer.apple.com/account) → Membership.
4. Push this git repo to GitHub (or GitLab/Bitbucket).
5. Sign up at [codemagic.io](https://codemagic.io) → add the repo → enable the **Shinno Sync → App Store Connect** workflow.
6. In Codemagic, add environment group `appstore` with:
   - `APP_STORE_CONNECT_ISSUER_ID`
   - `APP_STORE_CONNECT_KEY_IDENTIFIER`
   - `APP_STORE_CONNECT_PRIVATE_KEY` (full `.p8` text)
   - `APPLE_TEAM_ID`
   - optional `APP_STORE_APPLE_ID` (numeric Apple ID of the app in Connect)
7. Link the App Store Connect integration named `shinno` (or rename the `integrations.app_store_connect` value in `codemagic.yaml` to match).
8. Run the workflow. It builds a signed IPA and uploads to **TestFlight**.
9. On your **iPhone**, install via TestFlight, capture screenshots with kits powered, upload screenshots in Connect, then flip `submit_to_app_store: true` (or Submit for Review in Connect).

Codemagic’s free minutes are usually enough for a first submission. Paid minutes if you iterate a lot.

## Other options

| Option | Notes |
| --- | --- |
| **GitHub Actions `macos-latest`** | Free for public repos (limited minutes). Needs the same API key + certs; more YAML work than Codemagic. |
| **MacinCloud / MacStadium / AWS EC2 Mac** | Rent a remote Mac desktop, open Xcode, follow [`UPLOAD.md`](UPLOAD.md). |
| **Borrow a friend’s Mac** | One afternoon: install Xcode, Archive → Upload, done. |
| **Hire an iOS freelancer once** | Send them the `ShinnoSync-iOS-1.0.zip` + your Apple access (or API key). |

There is **no** Windows/Linux app that produces a valid App Store IPA without a Mac somewhere in the chain.

## What you can do without any Mac today

1. Enroll in Apple Developer Program.
2. Create the App Store Connect listing (metadata from `listing.txt` / `review-notes.txt`).
3. Publish the privacy policy page.
4. Fill App Privacy (Data Not Collected) + age rating + export compliance.
5. Push the repo and wire Codemagic as above.

Screenshots: use TestFlight on your iPhone after the first cloud build (preferred). Web preview screenshots are not acceptable for App Store listing.

## Hardware for App Review

Reviewers need powered Shinno kits (or you offer to ship a sample). Cloud build does not remove that requirement.
