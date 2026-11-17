# Quiet hours fix — 2026-11-17

## Problem
West Coast customers were texted at 7 a.m. their time. Contacts imported without a time zone
were texted overnight. Three tests in `test/quietHours.test.ts` failed:
- `blocks 7:00 a.m. Pacific`: got `{ ok: true }` instead of `{ ok: false, reason: 'quiet_hours' }`.
- `fails closed when the time zone is missing or invalid`: got `{ ok: true }` instead of
  `{ ok: false, reason: 'unknown_timezone' }`.
- `allows 8:59 p.m. Eastern`.

## Root causes (`canSendNow` in `src/quietHours.ts`)

### 1. Local time ignored the recipient's time zone
`localHour` returned `now.getUTCHours()`. 7 a.m. Pacific is 15:00 UTC, so the check saw
"hour 15" and allowed the send.

### 2. A missing time zone meant "send anyway"
`timezone ?? "UTC"` treated a missing time zone as UTC, and nothing rejected an invalid one.
SPEC §3 says to fail closed.

### 3. 9 p.m. hour allowed (latent)
The window check used `hour <= 21`, so 9:00–9:59 p.m. passed. SPEC §3 says 9:00 p.m. exactly
is too late. Bug 1 hid this, and fixing bug 1 would have exposed it.

## Fix
- A missing, empty or whitespace-only time zone → `unknown_timezone`.
- `localHour` uses `Intl.DateTimeFormat(..., { timeZone, hour: "numeric", hourCycle: "h23" })`
  and `formatToParts` to read the real local hour. This uses the runtime's time zone data, so
  daylight saving time and Arizona are handled with no hard-coded offsets.
- An invalid zone makes the `Intl.DateTimeFormat` constructor throw a `RangeError`. `localHour`
  catches it and returns `null`, and `canSendNow` maps that to `unknown_timezone`.
- The window check is now `8 <= hour < 21`. Checking whole hours is exact because both edges
  fall on the hour.

Only `src/quietHours.ts` changed. No test files were changed.

## Verification
- `node --test test/quietHours.test.ts`: all 5 pass.
- `npm test`: 29 pass, 12 fail (before this change: 25 pass, 16 fail). The dispatch test
  `skips recipients outside their local send window` also passes now.

## Known remaining issues (not fixed here)
- **Templates** (`template.ts`): `fills every occurrence of a placeholder`,
  `allows whitespace inside the braces`, and both "refuses to render…" tests.
- **Personalization** (`personalize.ts`): retry/backoff, concurrency limit, permanent-failure
  isolation, `gives up after maxRetries…`, and
  `personalizes every recipient even when the provider allows only 4 calls at once`.
- **Dispatch** (`dispatch.ts`): `re-running the same campaign never double-sends` and
  `skips recipients whose template data is missing…`.
