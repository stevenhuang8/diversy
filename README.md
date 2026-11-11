# campaign-dispatch — debugging exercise

You've just joined the team that owns **campaign-dispatch**, the service that sends Acme Invest's SMS campaigns. Acme Invest is fictional; this is not production code.

Last week's release had problems. Support, finance and compliance filed these reports:

1. **Compliance:** A customer replied `Stop.` and kept getting texts. Another replied `Opt-Out`: same thing.
2. **Support:** West Coast customers were texted at 7 a.m. their time. Contacts imported without a time zone were texted overnight.
3. **Support:** The nightly job timed out and retried, and people got the same text twice.
4. **Ops:** The job log says `sent: 0`, but messages definitely went out.
5. **Engineering:** Personalized campaigns crash whenever the LLM provider returns a few `429`s.
6. **Finance:** Our segment counts come out lower than the carrier's invoice.
7. **Support:** One customer got `Hi undefined,`. Another got a second sentence with a literal `{{firstName}}` in it.
8. **Compliance:** An AI-written text saying "you can't lose" got past the filter, even though the same text was blocked in staging.

## Your job (about 40 minutes)

- Fix as much as you can, **in the order you think matters most**. You probably won't finish, and that's expected.
- Use **Claude Code, Codex, or both**; that's the point of the exercise. Think out loud. We care how you direct, check and correct the AI, not how fast you type.
- **`SPEC.md` is the source of truth.** The tests are incomplete.
- **Don't change the tests to make them pass.** If you think a test is wrong, tell us.
- **Commit after each fix** with a message that says what you changed and why.

## Getting started

```bash
node -v                               # needs v22.18 or newer
npm test                              # works without npm install; expect lots of failures
node --test test/quietHours.test.ts   # run one file
```

- On Node 22.6–22.17, run `node --experimental-strip-types --test "test/**/*.test.ts"` instead.
- Optional: `npm install && npm run typecheck`.

## Layout

| Path | What it is |
|---|---|
| `src/dispatch.ts` | Entry point: filters recipients, personalizes copy, sends |
| `src/optout.ts` | Classifies inbound replies (STOP, etc.) |
| `src/quietHours.ts` | Checks the recipient's local send window |
| `src/template.ts` | Fills `{{placeholders}}` in approved copy |
| `src/personalize.ts` | Gets AI-written copy, with concurrency and retries |
| `src/guardrails.ts` | Compliance checks on AI-written copy |
| `src/segments.ts` | Counts SMS segments for billing |
| `src/llm.ts`, `src/provider.ts` | Fake LLM and fake SMS vendor. These are not part of the bug hunt |
| `test/` | Node's built-in test runner (`node:test`) |
