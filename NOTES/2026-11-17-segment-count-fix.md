# Segment count fix — 2026-11-17

## Problem
Finance reported that our segment counts came out lower than the carrier's invoice.
Two tests in `test/segments.test.ts` failed:
- `long GSM-7 messages are split into 153-character segments`: 307 characters gave 2 segments instead of 3.
- `GSM-7 extension characters cost two units each`: `"a" × 159 + "€"` gave
  `{ units: 160, segments: 1 }` instead of `{ units: 161, segments: 2 }`.

## Root causes (`src/segments.ts`)

### 1. Extension characters counted as 1 unit
`countSegments` used `text.length` for units in every encoding. In GSM-7, characters from the
extension table (`^ { } \ [ ] ~ | €` and form feed) are sent as ESC + char, so each one costs
2 septets (SPEC §5).

### 2. Multipart messages divided by the single-segment limit
Segments were `⌈units / 160⌉` (GSM-7) or `⌈units / 70⌉` (UCS-2) for every message. Once a message
needs more than one segment, each segment loses room to the concatenation header, so carriers
bill `⌈units / 153⌉` (GSM-7) or `⌈units / 67⌉` (UCS-2). We undercounted every long message.

## Fix
- **Units**: in GSM-7, add 2 for each character in the existing `GSM7_EXTENSION` set and 1 for
  everything else. UCS-2 still uses `text.length` (UTF-16 code units, so an emoji counts as 2).
- **Segments**, following the SPEC §5 table:
  - `single = GSM-7 ? 160 : 70`, `multi = GSM-7 ? 153 : 67`
  - `units === 0` → 0; `units <= single` → 1; otherwise `Math.ceil(units / multi)`

No test files were changed.

## Verification
- `node --test test/segments.test.ts`: all 8 pass.
- `npm test`: 25 pass, 16 fail (before this change: 22 pass, 19 fail). None of the remaining
  failures are segment tests.

## Known remaining issues (not fixed here)
- **Templates** (`template.ts`): `fills every occurrence of a placeholder`,
  `allows whitespace inside the braces`, and both "refuses to render…" tests.
- **Quiet hours** (`quietHours.ts`): `allows 8:59 p.m. Eastern`, `blocks 7:00 a.m. Pacific`,
  `fails closed when the time zone is missing or invalid`.
- **Personalization** (`personalize.ts`): retry/backoff, concurrency limit and fallback tests.
- **Dispatch** (`dispatch.ts`): `re-running the same campaign never double-sends`,
  `skips recipients outside their local send window`,
  `skips recipients whose template data is missing…`.
