import { test } from "node:test";
import assert from "node:assert/strict";
import { countSegments, detectEncoding } from "../src/segments.ts";

test("short plain text is a single GSM-7 segment", () => {
  assert.deepEqual(countSegments("Hi Ana, your statement is ready."), {
    encoding: "GSM-7",
    units: 32,
    segments: 1,
  });
});

test("an empty message uses no segments", () => {
  assert.equal(countSegments("").segments, 0);
});

test("160 GSM-7 characters fit in one segment; 161 need two", () => {
  assert.equal(countSegments("a".repeat(160)).segments, 1);
  assert.equal(countSegments("a".repeat(161)).segments, 2);
});

test("long GSM-7 messages are split into 153-character segments", () => {
  assert.equal(countSegments("a".repeat(306)).segments, 2);
  assert.equal(countSegments("a".repeat(307)).segments, 3);
  assert.equal(countSegments("a".repeat(460)).segments, 4);
});

test("GSM-7 extension characters cost two units each", () => {
  assert.deepEqual(countSegments("a".repeat(159) + "€"), { encoding: "GSM-7", units: 161, segments: 2 });
  assert.equal(countSegments("{promo}").units, 9);
});

test("curly quotes and non-Latin text force UCS-2", () => {
  assert.equal(detectEncoding("Don’t miss this"), "UCS-2");
  assert.equal(detectEncoding("你好"), "UCS-2");
  assert.equal(detectEncoding("Crêpes on Friday"), "UCS-2"); // ê is not in GSM-7
  assert.equal(detectEncoding("Café crème"), "GSM-7"); // é and è are
});

test("UCS-2 messages use 70 characters for one segment and 67 per segment after that", () => {
  assert.equal(countSegments("你".repeat(70)).segments, 1);
  assert.equal(countSegments("你".repeat(71)).segments, 2);
  assert.equal(countSegments("你".repeat(134)).segments, 2);
  assert.equal(countSegments("你".repeat(135)).segments, 3);
});

test("emoji take two UTF-16 units", () => {
  assert.deepEqual(countSegments("A".repeat(68) + "👋"), { encoding: "UCS-2", units: 70, segments: 1 });
  assert.deepEqual(countSegments("A".repeat(69) + "👋"), { encoding: "UCS-2", units: 71, segments: 2 });
});
