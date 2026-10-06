export function commissionAmount(grossEarnings: number, commissionPercent: number) {
  return Math.round((grossEarnings * commissionPercent) / 100);
}

export function partnerEarnings(grossEarnings: number, commissionPercent: number) {
  return grossEarnings - commissionAmount(grossEarnings, commissionPercent);
}

export function availablePartnerEarnings(grossEarnings: number, commissionPercent: number, reservedPayouts: number) {
  return Math.max(0, partnerEarnings(grossEarnings, commissionPercent) - reservedPayouts);
}
