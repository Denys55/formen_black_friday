# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Single-page **Black Friday** promo site for the For Men store (main site: https://for-men.ua). Visitors arrive from the main site, or offline by scanning a QR code on an in-store banner. They spin a discount wheel once and get a discount that comes with a QR code:
- **Online:** the QR code / promo code is used to redeem the discount on for-men.ua.
- **Offline:** the customer shows the result screen to the cashier.

## Hard requirements

- **Stack:** plain HTML, CSS, vanilla JavaScript. No frameworks, bundlers, npm, or build step. A small third-party library from a CDN (e.g. for QR generation) is fine.
- **Language:** all user-facing text must be in **Ukrainian**.
- **Black Friday** branding must be prominent.
- **Visual style** follows for-men.ua (colors, fonts, logo usage). Check the live site when making design decisions.
- **Spin limit:** one spin per user per hour. Persist the last spin time (and the won result, so it can be shown again) in `localStorage`. This is a client-side limit only, which is accepted for this stack.
- **Links** to the main site and social networks must be present (see below).

## Data-driven wheel

Promo codes and discount sizes live in a JSON file that the owner edits by hand. The wheel's segments are **generated from that file at runtime**. Never hard-code segments in the HTML or JS: adding or removing an entry in the JSON must change the wheel without touching code. Keep the JSON format simple and easy to edit by hand.

## Assets

- `materials/logo/`: source logos (TIF/PDF/JPG, large). Export a web-optimized copy (PNG/SVG/WebP) into the site's assets instead of referencing these directly.
- `materials/social_network_link.md`: social links:
  - Instagram: https://www.instagram.com/formenua
  - Telegram: https://t.me/formenuaclub

## Running locally

The page loads the JSON with `fetch()`, which fails when the page is opened as `file://`. Serve the folder over HTTP instead:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

To test the hourly limit, clear the relevant `localStorage` key in DevTools. The page must work well on mobile, since offline users arrive by scanning a QR code.
