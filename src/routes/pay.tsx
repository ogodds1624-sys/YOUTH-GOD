import { createFileRoute } from "@tanstack/react-router";
import { PaymentCheckout } from "@/components/payment-checkout";

export const Route = createFileRoute("/pay")({
  validateSearch: (search: Record<string, unknown>) => {
    const amount = Number(search.amount);
    return { amount: amount === 350 || amount === 400 || amount === 500 || amount === 800 || amount === 1700 ? amount : 350 };
  },
  component: PayPage,
});

function PayPage() {
  const { amount } = Route.useSearch();
  return <PaymentCheckout sessionAmount={amount} />;
}
