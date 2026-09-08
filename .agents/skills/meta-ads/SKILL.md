---
name: meta-ads
description: Official Meta (Facebook) Pixel and Conversions API reference docs for CodFlow's tracking stack — standard events, event parameters, deduplication, advanced matching, test events, and best practices. Use whenever working on Meta Pixel integration, CAPI server events, conversion tracking, event deduplication, attribution, or reviewing PRs that touch tracking (cod-server/src/workflows/capi.ts, capi-helpers.ts, capi_event_log, theme01 pixel scripts, store_pixel_config).
---

# Meta Ads — Pixel & Conversions API Official Documentation

CodFlow's tracking stack (Meta Pixel in theme01 + Conversions API in
cod-server) must always match **Meta's official behavior**. This skill
vendors the official documentation so every change — ours or a
contributor's — can be grounded against the real spec instead of guesses,
blog posts, or AI memory.

**Rule for agents and contributors: any tracking change must be verified
against these docs before review.** When replying to a tracking PR, read
the relevant reference here first and cite it.

## The docs (all unaltered official content, fetched from developers.facebook.com)

### Pixel — browser side (`fbq()`)

| File | What it covers |
|---|---|
| `references/pixel/pixel-overview.md` | What the Pixel is, redundant setup with CAPI |
| `references/pixel/pixel-get-started.md` | Installing the base code, the `fbq` queue |
| `references/pixel/pixel-reference-standard-events.md` | **The standard-event table** — exact definitions of `Purchase`, `Lead`, `InitiateCheckout`, etc. + object properties. The source of truth for "which event is this action?" |
| `references/pixel/pixel-conversion-tracking.md` | Firing events on actions vs page load, purchase-confirmation-page pattern |
| `references/pixel/pixel-advanced-matching.md` | `em`, `ph` etc. customer params on `fbq('init')` |
| `references/pixel/pixel-single-page-apps.md` | SPA pitfalls (irrelevant to our full-page loads — know why) |
| `references/pixel/pixel-custom-audiences.md` | Audience creation from Pixel data |
| `references/pixel/pixel-gdpr.md` | GDPR/Limited Data Use reasoning |
| `references/pixel/pixel-data-processing-options.md` | `_fbp` cookie + data processing options |

### Conversions API — server side (`/events` endpoint)

| File | What it covers |
|---|---|
| `references/conversions-api/capi-overview.md` | What CAPI is, redundant setup recommendation |
| `references/conversions-api/capi-get-started.md` | System user tokens, access, first request |
| `references/conversions-api/capi-using-the-api.md` | Endpoint mechanics, payloads, batching, error handling |
| `references/conversions-api/capi-parameters.md` | Parameters index |
| `references/conversions-api/capi-server-event-parameters.md` | **`event_name`, `event_time`, `event_id`, `event_source_url`, `action_source`** — the per-event field contract |
| `references/conversions-api/capi-customer-information-parameters.md` | Hashed `ph`, `em`, `client_ip_address`, `client_user_agent`, `fbp`, `fbc` — what we send and how it's normalized |
| `references/conversions-api/capi-custom-data-parameters.md` | `value`, `currency`, `contents`, `content_ids`, `order_id`, `num_items` |
| `references/conversions-api/capi-original-event-parameters.md` | Original-event dedup fields (aggregated/merged events) |
| `references/conversions-api/capi-main-body-parameters.md` | `data[]`, `test_event_code` wrapper |
| `references/conversions-api/capi-deduplication.md` | **Pixel ↔ CAPI dedup: browser `eventID` must equal CAPI `event_id` AND names must match.** The rule behind CodFlow's eventID = orderId pattern |
| `references/conversions-api/capi-best-practices.md` | Meta's recommended architecture, timing, and matching quality guidance |
| `references/conversions-api/capi-verifying-setup.md` | Events Manager validation, Test Events |
| `references/conversions-api/capi-offline-events.md` | Offline conversion semantics (delayed events — the category our purchase-on-delivery model lives in) |
| `references/conversions-api/capi-payload-helper.md` | Meta's interactive payload builder (for debugging shapes) |

## How CodFlow maps onto these docs (quick orientation)

- **Browser:** theme01's `BaseHead.astro` loads the canonical `fbevents.js`
  snippet (PageView on load); `thank-you.astro` fires the conversion event
  with `{ eventID: orderId }` — the fourth `fbq` argument, per the dedup doc.
- **Server:** `cod-server/src/workflows/capi.ts` (Cloudflare Workflow)
  sends the mirrored event via `/events` with `event_id: orderId`;
  `capi-helpers.ts` gates which status transitions trigger it;
  `capi_event_log` records what was sent (and powers idempotency).
- **Config:** `store_pixel_config` (pixel id, access token, test event
  code, conversion event choice, test mode) — Settings → Tracking.
- **Dedup contract:** browser `eventID` === CAPI `event_id` === orderId,
  same `event_name` on both sides. Any tracking change that breaks this
  equality double-counts conversions (see capi-deduplication.md).
- **Standard-event semantics:** which CodFlow moment maps to which Meta
  event is governed by pixel-reference-standard-events.md — notably
  `Purchase` is defined as at-checkout ("lands on thank you or
  confirmation page") and `Lead` as a completed sign-up. COD
  purchase-on-delivery is an offline-style delayed Purchase (see
  capi-offline-events.md) — legitimate, but it must be a deliberate
  merchant choice, not a silent default.

## Working rules for tracking changes

1. **Ground first.** Read the relevant reference file(s) above before
   writing or reviewing a single line of tracking code. Cite the doc in
   the PR/review when a decision hinges on Meta behavior.
2. **Never break the dedup equality** (browser eventID === server
   event_id, matching names) — silent double-counting or
   double-sending is the #1 tracking bug class.
3. **A new conversion-event mode must fire from BOTH sides** (browser +
   CAPI mirror) or from exactly ONE side deliberately, never accidentally.
   PR #103's lesson: a mode that exists only in the settings enum is not a
   feature.
4. **`capi_event_log` is the idempotency ledger** — anything that can fire
   twice (webhook retries, status toggles) must be guarded through it.
5. **Test Mode** (`test_event_code`) exists for verification — use
   capi-verifying-setup.md's flow before claiming an event works.
6. **Docs are read-only reference.** These files are unaltered Meta
   content (only a source header is prepended). Never edit them to match
   code — if code and docs disagree, the CODE changes (or Meta did, and
   we re-fetch).

## Refreshing the docs

Meta updates its docs; when a tracking question can't be answered from
these files (or the content looks outdated), re-fetch with Firecrawl:

```sh
firecrawl scrape "https://developers.facebook.com/documentation/<path>" --only-main-content
```

Keep the source header (URL + fetch date) on every file so staleness is
auditable. Content below the header stays unaltered.
