import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCopy } from "../src/guardrails.ts";

test("flags prohibited performance claims", () => {
  assert.deepEqual(checkCopy("Guaranteed 9% returns this quarter"), { ok: false, violations: ["prohibited_claim"] });
  assert.deepEqual(checkCopy("This one is risk-free, Ana"), { ok: false, violations: ["prohibited_claim"] });
});

test("gives the same answer every time it sees the same text", () => {
  const text = "You can't lose with this fund";
  for (let i = 0; i < 3; i++) {
    assert.equal(checkCopy(text).ok, false, `call #${i + 1} let a prohibited claim through`);
  }
});

test("allows compliant copy with an approved link", () => {
  assert.deepEqual(checkCopy("Hi Ana, your Q3 statement is ready: https://go.acme-invest.example/s/123"), {
    ok: true,
    violations: [],
  });
});

test("flags links to other domains", () => {
  assert.deepEqual(checkCopy("Details here: https://bit.ly/3xYz"), { ok: false, violations: ["unapproved_link"] });
});
