import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseNaira,
  money,
  canTransition,
  assertSeparation,
} from "../src/lib/domain";
test("money is exact and rejects fractions below kobo, exponents and minimum violations", () => {
  assert.equal(parseNaira("1000.01"), 100001n);
  assert.equal(parseNaira("9999999999.99"), 999999999999n);
  for (const v of ["999.99", "1e6", "-1000", "1000.001", "1,000", "NaN"])
    assert.throws(() => parseNaira(v));
  assert.equal(money(100001n), "₦1,000.01");
});
test("financial state transitions never skip bank review", () => {
  assert.equal(canTransition("proof_submitted", "confirmed"), false);
  assert.equal(canTransition("awaiting_payment", "confirmed"), false);
  assert.equal(canTransition("under_review", "confirmed"), true);
  assert.equal(canTransition("confirmed", "awaiting_payment"), false);
  assert.equal(canTransition("confirmed", "refunded"), true);
});
test("all three finance actors must differ", () => {
  assert.doesNotThrow(() => assertSeparation("a", "b", "c"));
  for (const ids of [
    ["a", "a", "b"],
    ["a", "b", "a"],
    ["a", "b", "b"],
  ])
    assert.throws(() => assertSeparation(...(ids as [string, string, string])));
});
