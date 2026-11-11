import { test } from "node:test";
import assert from "node:assert/strict";
import { dispatchCampaign } from "../src/dispatch.ts";
import { FakeLLM } from "../src/llm.ts";
import { FakeSmsProvider } from "../src/provider.ts";
import type { Campaign, Recipient } from "../src/types.ts";

// 11:00 a.m. Pacific / 2:00 p.m. Eastern: inside everyone's send window.
const MIDDAY = new Date("2026-11-17T19:00:00Z");

const TEMPLATE = "Hi {{firstName}}, your Acme Invest quarterly statement is ready. Reply STOP to opt out.";

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return { id: "cmp_q3_update", template: TEMPLATE, personalize: false, maxSegments: 2, ...overrides };
}

function people(): Recipient[] {
  return [
    { id: "r1", firstName: "Ana", phone: "+16195550101", timezone: "America/Los_Angeles", consent: true, optedOut: false },
    { id: "r2", firstName: "Ben", phone: "+12125550102", timezone: "America/New_York", consent: true, optedOut: false },
    { id: "r3", firstName: "Chen", phone: "+13125550103", timezone: "America/Chicago", consent: true, optedOut: false },
  ];
}

const deps = (provider = new FakeSmsProvider(), llm = new FakeLLM(), now = MIDDAY) => ({
  provider,
  llm,
  now,
  personalize: { sleep: async () => {} },
});

test("sends one message to every eligible recipient and reports it", async () => {
  const provider = new FakeSmsProvider();
  const result = await dispatchCampaign(campaign(), people(), deps(provider));

  assert.deepEqual(result.sent.map((m) => m.recipientId), ["r1", "r2", "r3"]);
  assert.equal(provider.delivered.length, 3);
  assert.equal(provider.delivered[0].body, "Hi Ana, your Acme Invest quarterly statement is ready. Reply STOP to opt out.");
});

test("re-running the same campaign never double-sends", async () => {
  const provider = new FakeSmsProvider();
  await dispatchCampaign(campaign(), people(), deps(provider));
  await dispatchCampaign(campaign(), people(), deps(provider)); // e.g. the job retried after a timeout
  assert.equal(provider.delivered.length, 3);
});

test("skips opted-out recipients and records why", async () => {
  const list = people();
  list[1].optedOut = true;
  const result = await dispatchCampaign(campaign(), list, deps());

  assert.deepEqual(result.skipped, [{ recipientId: "r2", reason: "opted_out" }]);
  assert.deepEqual(result.sent.map((m) => m.recipientId), ["r1", "r3"]);
});

test("skips recipients outside their local send window", async () => {
  // 7:30 a.m. Pacific, 10:30 a.m. Eastern, 9:30 a.m. Central
  const early = new Date("2026-11-17T15:30:00Z");
  const result = await dispatchCampaign(campaign(), people(), deps(new FakeSmsProvider(), new FakeLLM(), early));

  assert.deepEqual(result.skipped, [{ recipientId: "r1", reason: "quiet_hours" }]);
  assert.deepEqual(result.sent.map((m) => m.recipientId), ["r2", "r3"]);
});

test("falls back to the approved copy when AI copy is non-compliant", async () => {
  const llm = new FakeLLM({ responses: { r1: "Ana, this fund is guaranteed to beat the market!" } });
  const result = await dispatchCampaign(campaign({ personalize: true }), people(), deps(new FakeSmsProvider(), llm));

  const ana = result.sent.find((m) => m.recipientId === "r1");
  assert.equal(ana?.body, "Hi Ana, your Acme Invest quarterly statement is ready. Reply STOP to opt out.");
  assert.equal(ana?.personalized, false);
  assert.equal(result.sent.find((m) => m.recipientId === "r2")?.personalized, true);
});

test("falls back to the approved copy when AI copy blows the segment budget", async () => {
  const llm = new FakeLLM({ responses: { r2: "Ben! " + "Here is a very long update. ".repeat(15) } });
  const result = await dispatchCampaign(campaign({ personalize: true }), people(), deps(new FakeSmsProvider(), llm));

  const ben = result.sent.find((m) => m.recipientId === "r2");
  assert.equal(ben?.personalized, false);
  assert.equal(ben?.segments, 1);
});

test("skips recipients whose template data is missing instead of sending broken copy", async () => {
  const list = people();
  list[2].firstName = "";
  const provider = new FakeSmsProvider();
  const result = await dispatchCampaign(campaign(), list, deps(provider));

  assert.deepEqual(result.skipped, [{ recipientId: "r3", reason: "template_error" }]);
  assert.equal(provider.delivered.length, 2);
});
