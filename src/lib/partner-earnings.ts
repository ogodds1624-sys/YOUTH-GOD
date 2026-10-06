export function commissionAmount(grossEarnings: number, commissionPercent: number) {
  return Math.round((grossEarnings * commissionPercent) / 100);
}

export function partnerEarnings(grossEarnings: number, commissionPercent: number) {
  return grossEarnings - commissionAmount(grossEarnings, commissionPercent);
}

export function availablePartnerEarnings(grossEarnings: number, commissionPercent: number, reservedPayouts: number) {
  return Math.max(0, partnerEarnings(grossEarnings, commissionPercent) - reservedPayouts);
}

export function previousSettlementDate(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: "year" | "month" | "day") => Number(parts.find((item) => item.type === type)?.value);
  const previous = new Date(Date.UTC(part("year"), part("month") - 1, part("day") - 1));
  return [
    previous.getUTCFullYear().toString().padStart(4, "0"),
    (previous.getUTCMonth() + 1).toString().padStart(2, "0"),
    previous.getUTCDate().toString().padStart(2, "0"),
  ].join("-");
}

export function settlementGross(
  payments: readonly { amount: number | string; date: string }[],
  settlementDate: string,
) {
  return payments.reduce(
    (sum, payment) => sum + (payment.date === settlementDate ? Number(payment.amount) : 0),
    0,
  );
}
