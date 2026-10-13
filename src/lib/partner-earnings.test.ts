import assert from "node:assert/strict";
import test from "node:test";
import {
  availablePartnerEarnings,
  availableTotalPartnerEarnings,
  commissionAmount,
  partnerSettlementBalances,
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

test("calculates available balance from total earnings minus reserved payouts", () => {
  assert.equal(availableTotalPartnerEarnings(1500, 500), 1000);
  assert.equal(availableTotalPartnerEarnings(1500, 1500), 0);
  assert.equal(availableTotalPartnerEarnings(1500, 2000), 0);
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

test("keeps rejected settlement earnings available on later days", () => {
  const payments = [
    { amount: 1000, date: "2026-10-04" },
    { amount: 500, date: "2026-10-05" },
  ];
  const payouts = [
    { amount: 800, earningDate: "2026-10-04", status: "rejected" },
    { amount: 200, earningDate: "2026-10-05", status: "pending" },
  ];

  assert.deepEqual(
    partnerSettlementBalances(payments, ["2026-10-05", "2026-10-04"], 20, payouts),
    [
      { earningDate: "2026-10-05", available: 200 },
      { earningDate: "2026-10-04", available: 800 },
    ],
  );
});
