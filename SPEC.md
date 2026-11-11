# campaign-dispatch — Product & Compliance Spec (v0.4)

This file is the source of truth. The tests cover some of it, not all of it.
Acme Invest is a fictional company, and these rules are simplified for this exercise. They are not legal advice.

## 1. Inbound replies — `src/optout.ts`

Standard opt-out keywords: **stop, quit, end, revoke, opt out, cancel, unsubscribe**.

| Reply | Result |
|---|---|
| Exactly one keyword. Case, surrounding spaces, punctuation and hyphens are ignored, so `Stop.`, `CANCEL!` and `Opt-Out` all count | `opt_out` |
| A keyword appears as a whole word inside a longer message, e.g. `please stop texting me` | `review` (a person decides) |
| Anything else. Partial words don't count, e.g. `backend`, `stopping by` | `none` |

## 2. Who may be texted — `src/dispatch.ts`

A recipient is texted only if all of these hold. Check them in this order; the first rule that fails is the skip reason.

1. Has not opted out → otherwise `opted_out`
2. Has consent on file (`consent: true`) → otherwise `no_consent`
3. Has a valid IANA time zone → otherwise `unknown_timezone`
4. Is inside the send window (§3) → otherwise `quiet_hours`

Every input recipient appears exactly once in the result, either in `sent` or in `skipped`.

## 3. Send window — `src/quietHours.ts`

- Allowed: **8:00 a.m. ≤ local time < 9:00 p.m.**, in the **recipient's** time zone. 9:00 p.m. exactly is too late.
- Use the time zone's real rules, including daylight saving time. Arizona does not observe daylight saving time. Do not hard-code UTC offsets.
- If the time zone is missing or invalid, do not send (fail closed).

## 4. Message copy

### 4.1 Templates — `src/template.ts`
- Placeholders look like `{{name}}`, with optional whitespace inside the braces: `{{ name }}`.
- Fill every occurrence.
- If a value is missing, empty or only whitespace, or the template names a variable that wasn't supplied, throw `MissingVariableError`. Dispatch then skips that recipient with `template_error`. Never send `undefined` or raw `{{...}}`.
- Nothing else in the approved copy may change.

### 4.2 AI personalization — `src/personalize.ts`
- At most `concurrency` LLM calls in flight at once (default 4).
- Retry retryable errors (429, 5xx) up to `maxRetries` times (default 2), waiting 100 ms, then 200 ms, doubling each time. Use the injected `sleep`.
- Do not retry permanent errors.
- If one recipient fails, that recipient alone falls back to the approved template (`body: null`). The rest of the batch carries on.
- Return results in the same order as the input.

### 4.3 Guardrails — `src/guardrails.ts`
AI-written copy is rejected (falls back to the approved template) if:
- it makes a prohibited claim: *guaranteed*, *risk-free*, *no risk*, *can't lose* (any case), or
- it contains **any** link whose hostname is not exactly `go.acme-invest.example`.

The same text must always get the same answer.

### 4.4 Segment budget — `src/dispatch.ts`
- If personalized copy needs more than `campaign.maxSegments` segments, use the approved template instead.
- If the approved template is also over budget, skip the recipient with `over_budget`.

## 5. Segment counting — `src/segments.ts`

Carriers bill per segment, and finance reconciles these counts against the invoice.

- **Encoding:** GSM-7 if every character is in the GSM 03.38 basic or extension table; otherwise UCS-2.
- **Units:** in GSM-7, extension characters (`^ { } \ [ ] ~ | €` and form feed) count as 2 and everything else counts as 1. In UCS-2, units are UTF-16 code units, so an emoji counts as 2.
- **Segments:**

| Encoding | 1 segment if units ≤ | Otherwise |
|---|---|---|
| GSM-7 | 160 | ⌈units / 153⌉ |
| UCS-2 | 70 | ⌈units / 67⌉ |

## 6. Sending — `src/dispatch.ts`

- The idempotency key is `${campaignId}:${recipientId}`. It is the same on every attempt, so if the nightly job retries a run, nobody gets the same message twice.
- `dispatchCampaign` resolves only after every send has finished, and its result lists them.
