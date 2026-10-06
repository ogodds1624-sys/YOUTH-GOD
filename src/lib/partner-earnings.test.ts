import assert from "node:assert/strict";
import test from "node:test";
import { commissionAmount, partnerEarnings } from "./partner-earnings.ts";

test("deducts the partner commission from gross earnings", () => {
  assert.equal(commissionAmount(1000, 20), 200);
  assert.equal(partnerEarnings(1000, 20), 800);
});

test("applies each partner's commission percentage", () => {
  assert.equal(partnerEarnings(1000, 0), 1000);
  assert.equal(partnerEarnings(1000, 10), 900);
  assert.equal(partnerEarnings(1000, 35), 650);
  assert.equal(partnerEarnings(1000, 100), 0);
});
