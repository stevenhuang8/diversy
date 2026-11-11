import { test } from "node:test";
import assert from "node:assert/strict";
import { FakeLLM } from "../src/llm.ts";
import { personalizeAll } from "../src/personalize.ts";
import type { Campaign, Recipient } from "../src/types.ts";

const campaign: Campaign = {
  id: "cmp_q3_update",
  template: "Hi {{firstName}}, your quarterly statement is ready. Reply STOP to opt out.",
  personalize: true,
  maxSegments: 2,
};

function recipients(count: number): Recipient[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `r${i}`,
    firstName: `Name${i}`,
    phone: `+1619555${String(i).padStart(4, "0")}`,
    timezone: "America/Los_Angeles",
    consent: true,
    optedOut: false,
  }));
}

const noSleep = async () => {};

test("personalizes every recipient even when the provider allows only 4 calls at once", async () => {
  const llm = new FakeLLM({ maxConcurrent: 4 });
  const results = await personalizeAll(llm, campaign, recipients(10), { concurrency: 4, maxRetries: 2, sleep: noSleep });
  assert.equal(results.length, 10);
  assert.ok(results.every((r) => r.body !== null), "some recipients fell back to the static template");
});

test("never runs more LLM calls at once than the configured concurrency", async () => {
  const llm = new FakeLLM({ maxConcurrent: 10 });
  await personalizeAll(llm, campaign, recipients(10), { concurrency: 3, maxRetries: 2, sleep: noSleep });
  assert.ok(llm.peakInFlight <= 3, `peak in-flight was ${llm.peakInFlight}`);
});

test("keeps results in the same order as the input", async () => {
  const llm = new FakeLLM({ maxConcurrent: 10, latencyFor: { r0: 40, r1: 20 } });
  const results = await personalizeAll(llm, campaign, recipients(6), { concurrency: 3, maxRetries: 2, sleep: noSleep });
  assert.deepEqual(results.map((r) => r.recipientId), ["r0", "r1", "r2", "r3", "r4", "r5"]);
  assert.match(results[0].body ?? "", /Name0/);
});

test("retries a transient failure and then succeeds", async () => {
  const llm = new FakeLLM({ maxConcurrent: 10, failTimesFor: { r2: 1 } });
  const results = await personalizeAll(llm, campaign, recipients(5), { concurrency: 4, maxRetries: 2, sleep: noSleep });
  assert.notEqual(results[2].body, null);
  assert.equal(llm.callsFor("r2"), 2);
});

test("backs off 100ms then 200ms between retries", async () => {
  const delays: number[] = [];
  const llm = new FakeLLM({ maxConcurrent: 10, failTimesFor: { r0: 2 } });
  const results = await personalizeAll(llm, campaign, recipients(1), {
    concurrency: 1,
    maxRetries: 2,
    sleep: async (ms) => {
      delays.push(ms);
    },
  });
  assert.notEqual(results[0].body, null);
  assert.deepEqual(delays, [100, 200]);
});

test("gives up after maxRetries and falls back for that recipient only", async () => {
  const llm = new FakeLLM({ maxConcurrent: 10, failTimesFor: { r1: 99 } });
  const results = await personalizeAll(llm, campaign, recipients(3), { concurrency: 4, maxRetries: 2, sleep: noSleep });
  assert.equal(results[1].body, null);
  assert.equal(llm.callsFor("r1"), 3);
  assert.notEqual(results[0].body, null);
  assert.notEqual(results[2].body, null);
});

test("does not retry permanent failures, and isolates them", async () => {
  const llm = new FakeLLM({ maxConcurrent: 10, alwaysFailFor: ["r3"] });
  const results = await personalizeAll(llm, campaign, recipients(5), { concurrency: 4, maxRetries: 2, sleep: noSleep });
  assert.equal(results[3].body, null);
  assert.equal(llm.callsFor("r3"), 1);
  assert.equal(results.filter((r) => r.body !== null).length, 4);
});

test("discards AI copy that fails the guardrails", async () => {
  const llm = new FakeLLM({ maxConcurrent: 10, responses: { r1: "Guaranteed returns, Name1!" } });
  const results = await personalizeAll(llm, campaign, recipients(3), { concurrency: 4, maxRetries: 2, sleep: noSleep });
  assert.equal(results[1].body, null);
  assert.notEqual(results[0].body, null);
});
