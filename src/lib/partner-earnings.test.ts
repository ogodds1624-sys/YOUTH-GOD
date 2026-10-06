import assert from "node:assert/strict";
import test from "node:test";
import {
  availablePartnerEarnings,
  commissionAmount,
  partnerEarnings,
  previousSettlementDate,
  settlementGross,
} from "./partner-earnings.ts";

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

test("reserves pending and paid payouts from available earnings", () => {
  assert.equal(availablePartnerEarnings(1000, 20, 250), 550);
  assert.equal(availablePartnerEarnings(1000, 20, 900), 0);
});

test("uses the prior local calendar day for Ghana and Nigeria settlements", () => {
  const now = new Date("2026-10-06T00:30:00.000Z");
  assert.equal(previousSettlementDate(now, "Africa/Accra"), "2026-10-05");
  assert.equal(previousSettlementDate(now, "Africa/Lagos"), "2026-10-05");
});

test("resolves Ghana and Nigeria yesterday independently near midnight", () => {
  const now = new Date("2026-10-05T23:30:00.000Z");
  assert.equal(previousSettlementDate(now, "Africa/Accra"), "2026-10-04");
  assert.equal(previousSettlementDate(now, "Africa/Lagos"), "2026-10-05");
});

test("resolves yesterday correctly across a local month boundary", () => {
  const now = new Date("2026-11-01T12:00:00.000Z");
  assert.equal(previousSettlementDate(now, "Africa/Accra"), "2026-10-31");
});

test("only includes payments settled on the eligible previous day", () => {
  const payments = [
    { amount: 100, date: "2026-10-05" },
    { amount: "250", date: "2026-10-05" },
    { amount: 900, date: "2026-10-06" },
    { amount: 400, date: "2026-10-04" },
  ];
  assert.equal(settlementGross(payments, "2026-10-05"), 350);
});
