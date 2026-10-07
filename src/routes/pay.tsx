import { createFileRoute } from "@tanstack/react-router";
import { PaymentCheckout } from "@/components/payment-checkout";

export const Route = createFileRoute("/pay")({
  validateSearch: (search: Record<string, unknown>): { amount?: number; package?: string } => {
    const amount = Number(search.amount);
    return {
      amount: Number.isInteger(amount) && amount > 0 ? amount : undefined,
      package: typeof search.package === "string" ? search.package : undefined,
    };
  },
  component: PayPage,
});

function PayPage() {
  const { amount, package: packageId } = Route.useSearch();
  return <PaymentCheckout key={packageId ?? amount ?? "quick"} sessionAmount={amount} packageId={packageId} />;
}
