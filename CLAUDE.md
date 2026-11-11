# campaign-dispatch

A Node/TypeScript service that sends compliance-approved, optionally AI-personalized SMS campaigns.
`SPEC.md` defines the required behavior.

## Commands

- `npm test`: run all tests with Node's built-in runner. No install needed.
- `node --test test/<name>.test.ts`: run one test file.
- `npm install && npm run typecheck`: optional TypeScript check.

## Runtime constraints

- Node ≥ 22.18 runs `.ts` files directly by stripping types. So:
  - import local files with the `.ts` extension
  - use `import type` for imports that are only types
  - don't use enums, namespaces or constructor parameter properties
- The project has no runtime dependencies. Don't add any.

## Layout

- `src/dispatch.ts`: entry point (`dispatchCampaign`)
- `src/optout.ts`, `src/quietHours.ts`, `src/template.ts`, `src/segments.ts`, `src/guardrails.ts`: rules
- `src/personalize.ts`: LLM calls with concurrency and retries
- `src/llm.ts`, `src/provider.ts`: test doubles for the LLM and the SMS vendor
- `test/`: `node:test` + `node:assert/strict`

## Conventions

- Inject time (`now`) and waiting (`sleep`) so tests stay deterministic and fast.
- Keep the copy in `campaign.template` exactly as approved, apart from filling placeholders.
