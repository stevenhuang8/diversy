import { test } from "node:test";
import assert from "node:assert/strict";
import { MissingVariableError, render } from "../src/template.ts";

test("fills every occurrence of a placeholder", () => {
  assert.equal(
    render("Hi {{firstName}}! {{firstName}}, your statement is ready.", { firstName: "Ana" }),
    "Hi Ana! Ana, your statement is ready.",
  );
});

test("allows whitespace inside the braces", () => {
  assert.equal(render("Hi {{ firstName }}.", { firstName: "Ben" }), "Hi Ben.");
});

test("refuses to render when a value is missing or blank", () => {
  assert.throws(() => render("Hi {{firstName}}", { firstName: undefined }), MissingVariableError);
  assert.throws(() => render("Hi {{firstName}}", { firstName: "" }), MissingVariableError);
  assert.throws(() => render("Hi {{firstName}}", { firstName: "   " }), MissingVariableError);
});

test("refuses to render when the template uses a variable that was not supplied", () => {
  assert.throws(() => render("Hi {{firstName}}, your advisor is {{advisor}}", { firstName: "Ana" }), MissingVariableError);
});

test("leaves the rest of the approved copy untouched", () => {
  assert.equal(
    render("Earn {{rate}} on $500+. Reply STOP to opt out.", { rate: "8%" }),
    "Earn 8% on $500+. Reply STOP to opt out.",
  );
});
