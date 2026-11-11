import { test } from "node:test";
import assert from "node:assert/strict";
import { canSendNow } from "../src/quietHours.ts";

const LA = "America/Los_Angeles";
const NY = "America/New_York";

test("blocks 7:00 a.m. Pacific", () => {
  assert.deepEqual(canSendNow(new Date("2026-11-17T15:00:00Z"), LA), { ok: false, reason: "quiet_hours" });
});

test("allows 8:00 a.m. Pacific", () => {
  assert.deepEqual(canSendNow(new Date("2026-11-17T16:00:00Z"), LA), { ok: true });
});

test("allows 8:59 p.m. Eastern", () => {
  assert.deepEqual(canSendNow(new Date("2026-11-18T01:59:00Z"), NY), { ok: true });
});

test("blocks 9:00 p.m. and 9:30 p.m. Eastern", () => {
  assert.deepEqual(canSendNow(new Date("2026-11-18T02:00:00Z"), NY), { ok: false, reason: "quiet_hours" });
  assert.deepEqual(canSendNow(new Date("2026-11-18T02:30:00Z"), NY), { ok: false, reason: "quiet_hours" });
});

test("fails closed when the time zone is missing or invalid", () => {
  const midday = new Date("2026-11-17T19:00:00Z");
  assert.deepEqual(canSendNow(midday, undefined), { ok: false, reason: "unknown_timezone" });
  assert.deepEqual(canSendNow(midday, "Mars/Olympus_Mons"), { ok: false, reason: "unknown_timezone" });
});
