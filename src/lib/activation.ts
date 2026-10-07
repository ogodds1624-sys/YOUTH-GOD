export type PaymentPurpose = "session" | "activation";

export function activationFee(country: "Ghana" | "Nigeria") {
  return country === "Nigeria" ? 7000 : 50;
}
