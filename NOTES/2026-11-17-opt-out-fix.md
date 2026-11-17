# Opt-out fix — 2026-11-17

## Problem
A customer replied `Stop.` and kept getting texts. Another replied `Opt-Out` and had the same problem.
The test `skips opted-out recipients and records why` failed: `result.sent` was `[]` instead of `['r1', 'r3']`.

## Root causes

### 1. Opt-out replies weren't recognized (`src/optout.ts`)
`classifyInbound` only matched an exact, case-sensitive keyword list
(`STOP`, `UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT`). So `Stop.`, `stop` and `Opt-Out` were never
classified as `opt_out`, and the recipient's `optedOut` flag was never set. `revoke` and
`opt out` were also missing, though SPEC §1 requires them. The `review` check used
a substring match, so a word like `backend` would also have matched `end`.

### 2. `dispatchCampaign` returned before sending (`src/dispatch.ts`)
Messages were sent inside `eligible.forEach(async …)`. `forEach` doesn't wait for async
callbacks, so the function returned before any `provider.send` finished and
`result.sent` was always empty. This breaks SPEC §6: "resolves only after every send has finished".

## Fix
- **`src/optout.ts`**: the keywords are now `stop, quit, end, revoke, opt out, cancel, unsubscribe`.
  A new `normalize()` helper lowercases the reply, turns hyphens and punctuation into spaces,
  collapses whitespace and trims.
  - Normalized reply equals a keyword → `opt_out`
  - Keyword appears as a whole word in a longer reply → `review`
  - Otherwise → `none` (so `stopping` and `backend` don't match)
- **`src/dispatch.ts`**: the `forEach(async …)` is now a `for (const [index, recipient] of eligible.entries())`
  loop that waits for each send. The early `return`s are now `continue`s. Sends happen one at a time,
  so `sent` stays in input order.

No test files were changed.

## Verification
`node --test test/optout.test.ts test/dispatch.test.ts`: 8 pass, 3 fail.
- All 4 opt-out tests pass.
- `skips opted-out recipients and records why` passes.
- These dispatch tests also pass now: `sends one message to every eligible recipient`, and both
  "falls back to the approved copy" tests.

## Known remaining issues (not fixed here)
- **Double-sends on retry**: the idempotency key includes `randomUUID()`, but SPEC §6 requires
  `${campaignId}:${recipientId}`. Test: `re-running the same campaign never double-sends`.
- **No consent check**: dispatch never checks `consent`, and it doesn't apply the SPEC §2 skip
  reasons (`no_consent`, `unknown_timezone`) in the order the spec gives.
- `skips recipients outside their local send window` and
  `skips recipients whose template data is missing…` still fail. These are probably bugs in
  `quietHours.ts` and `template.ts`, whose own tests also fail. Not yet investigated.
