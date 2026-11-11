import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyInbound } from "../src/optout.ts";

test("standard keywords opt out regardless of case, spacing or trailing punctuation", () => {
  for (const body of ["STOP", "stop", "Stop.", "  stop  ", "Unsubscribe", "CANCEL!", "end", "Quit"]) {
    assert.equal(classifyInbound(body), "opt_out", `expected opt_out for ${JSON.stringify(body)}`);
  }
});

test("every standard keyword in SPEC.md is recognised", () => {
  for (const body of ["revoke", "REVOKE", "opt out", "Opt-Out", "OPT OUT"]) {
    assert.equal(classifyInbound(body), "opt_out", `expected opt_out for ${JSON.stringify(body)}`);
  }
});

test("a keyword inside a longer reply goes to human review", () => {
  assert.equal(classifyInbound("Please stop texting me"), "review");
  assert.equal(classifyInbound("can I cancel my appointment?"), "review");
});

test("ordinary replies are not opt-outs", () => {
  for (const body of [
    "Sounds good, thanks!",
    "Stopping by the office Friday",
    "What's the minimum investment?",
    "Our backend team says hi",
  ]) {
    assert.equal(classifyInbound(body), "none", `expected none for ${JSON.stringify(body)}`);
  }
});
