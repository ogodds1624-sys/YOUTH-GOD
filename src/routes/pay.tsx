import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Copy, LoaderCircle, ShieldCheck, Smartphone, X } from "lucide-react";
import { CONNECTING_PHONE_MESSAGE, SignalLoading } from "@/components/signal-loading";
import { getPaymentStatus, getSportyLink, recordPayment } from "@/lib/admin-snapshot";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useLiveStorefront } from "@/lib/storefront-live";
import { clearPendingPayment, confirmPendingPayment, readPendingPayment, savePendingPayment } from "@/lib/desk-session";
import { rememberReferral, storedReferral } from "@/lib/remember-ref";
import { openTask } from "@/lib/task-order";

export const Route = createFileRoute("/pay")({
  validateSearch: (search: Record<string, unknown>) => {
    const amount = Number(search.amount);
    return { amount: amount === 350 || amount === 400 || amount === 500 || amount === 800 || amount === 1700 ? amount : 350 };
  },
  component: PayPage,
});

function PayPage() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const { amount } = Route.useSearch();
  const store = useLiveStorefront();
  const userId = user?.id ?? "";
  const devFallback = user?.isDevFallback === true;
  const [allowed, setAllowed] = useState(false);
  const [choice, setChoice] = useState(0);
  const [receipt, setReceipt] = useState("");
  const [receiptName, setReceiptName] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [result, setResult] = useState<"pending" | "confirmed" | "rejected">("pending");
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);

  useEffect(() => {
    if (isPending) return;
    let stop = false;
    void getSportyLink()
      .then((link) => {
        if (stop) return;
        if (!link.signedIn || devFallback) {
          void navigate({ to: "/register", viewTransition: false });
          return;
        }
        if (!link.linked) {
          void openTask(navigate, link);
          return;
        }
        if (link.country === "Nigeria") {
          void navigate({ to: "/nigeria-pay", viewTransition: false });
          return;
        }
        setAllowed(true);
      })
      .catch(() => {
        if (stop) return;
        setError("Could not open checkout. Go back and choose the package again.");
      });
    return () => {
      stop = true;
    };
  }, [isPending, userId, devFallback, navigate]);

  useEffect(() => {
    if (!allowed || paymentId) return;
    const saved = readPendingPayment();
    if (!saved) return;
    if (saved.amount !== amount) {
      void navigate({ to: "/pay", search: { amount: saved.amount }, replace: true, viewTransition: false });
      return;
    }
    let stop = false;
    void getPaymentStatus({ data: { id: saved.id } })
      .then((row) => {
        if (stop) return;
        if (row.status === "rejected") {
          clearPendingPayment();
          setResult("rejected");
          setPaymentId(saved.id);
        } else {
          setPaymentId(saved.id);
          if (row.status === "confirmed") setResult("confirmed");
        }
      })
      .catch(() => {
        // Keep the saved payment so the next visit can resume waiting.
      });
    return () => {
      stop = true;
    };
  }, [allowed, amount, paymentId, navigate]);

  useEffect(() => {
    if (!paymentId || result !== "pending") return;
    const timer = window.setInterval(() => {
      void getPaymentStatus({ data: { id: paymentId } }).then((row) => {
        if (row.status === "confirmed" || row.status === "rejected") setResult(row.status);
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [paymentId, result]);

  useEffect(() => {
    if (result === "confirmed") {
      confirmPendingPayment(paymentId ?? "", amount);
      clearPendingPayment();
      void navigate({ to: "/session" });
      return;
    }
    if (result === "rejected") {
      clearPendingPayment();
      void navigate({ to: "/packages", search: { rejected: 1 }, viewTransition: false });
    }
  }, [result, amount, navigate]);

  const options = [
    ...(store?.wallets ?? []).map((wallet) => ({
      kind: "momo" as const,
      label: wallet.network,
      number: wallet.number,
      name: wallet.name,
    })),
    ...(store?.banks ?? []).map((account) => ({
      kind: "bank" as const,
      label: account.bank || "Bank transfer",
      number: account.number,
      name: account.name,
    })),
  ];
  const selected = options[choice] ?? options[0];

  function copyNumber() {
    if (!selected) return;
    const field = document.createElement("textarea");
    field.value = selected.number;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.top = "0";
    field.style.left = "0";
    field.style.opacity = "0";
    document.body.append(field);
    field.focus();
    field.select();
    field.setSelectionRange(0, selected.number.length);
    const ok = document.execCommand("copy");
    field.remove();
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      return;
    }
    void navigator.clipboard.writeText(selected.number).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }

  function onReceipt(file: File | undefined) {
    if (!file) {
      setReceipt("");
      setReceiptName("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReceipt(typeof reader.result === "string" ? reader.result : "");
      setReceiptName(file.name);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (sendingRef.current || paymentId) return;
    if (!receipt) {
      setError("Attach a screenshot of your payment.");
      return;
    }
    setError(null);
    sendingRef.current = true;
    setSending(true);
    try {
      await rememberReferral();
      const saved = await recordPayment({ data: { name: "", amount, receipt, referredBy: storedReferral() } });
      setPaymentId(saved.id);
      savePendingPayment(saved.id, amount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that payment.");
      sendingRef.current = false;
      setSending(false);
    }
  }

  const waitingLabel =
    result === "confirmed" ? CONNECTING_PHONE_MESSAGE : result === "rejected" ? "payment rejected" : "waiting for confirmation";

  return (
    <main className="home-theme flex min-h-dvh items-start justify-center px-3 py-6 text-white sm:items-center">
      {result === "rejected" ? (
        <div className="reject-alert fixed inset-0 z-50 grid place-items-center bg-black/80 px-6" role="alert">
          <div className="reject-card w-full max-w-sm rounded-3xl border border-red bg-[#140606] px-5 py-7 text-center">
            <p className="text-xs font-extrabold tracking-[0.2em] text-red">PAYMENT REJECTED</p>
            <p className="mt-3 text-2xl font-extrabold">Your payment was rejected</p>
            <p className="mt-2 text-sm text-white/70">Sending you back to the packages page.</p>
          </div>
        </div>
      ) : paymentId ? (
        <SignalLoading label={waitingLabel} />
      ) : null}
      <section className="payment-card auth-card w-full max-w-lg rounded-[28px] px-5 py-5 sm:px-7 sm:py-7">
        <div className="flex items-center justify-between gap-3">
          <p className="payment-kicker">
            {selected?.kind === "bank" ? "BANK TRANSFER" : "MOBILE MONEY"}
          </p>
          <Link
            to="/packages"
            aria-label="Close"
            className="payment-close grid size-9 place-items-center rounded-xl text-white no-underline"
          >
            <X className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="payment-heading-row mt-3">
          <div className="payment-method-icon" aria-hidden="true">
            {selected?.kind === "bank" ? <ShieldCheck /> : <Smartphone />}
          </div>
          <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {selected?.kind === "bank" ? "Pay by bank transfer" : "Pay by MoMo transfer"}
        </h1>
        <p className="mt-1 text-sm text-white/65">{store?.businessName ?? "Casino World"}</p>
          </div>
        </div>
        <div className="payment-amount-card mt-5">
          <div>
            <p className="payment-amount-label">AMOUNT TO SEND</p>
            <p className="payment-amount-value">GHS {amount.toLocaleString("en-GH")}</p>
          </div>
          <ShieldCheck className="size-6 text-gold" aria-hidden />
        </div>

        {!store ? (
          <p className="mt-6 text-sm text-white/70">Loading checkout…</p>
        ) : !selected ? (
          <p className="payment-empty mt-6 text-sm text-white/70">
            Checkout is not ready yet. Save a wallet or bank account on the admin payment gateway.
          </p>
        ) : (
          <>
            {options.length > 1 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {options.map((option, index) => (
                  <button
                    key={`${option.kind}-${option.number}`}
                    type="button"
                    onClick={() => setChoice(index)}
                    className={
                      "payment-method-option " +
                      (index === choice ? "is-selected" : "")
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
            <dl className="payment-details mt-5 overflow-hidden rounded-2xl">
              <div className="payment-detail-row">
                <dt className="payment-detail-label">
                  {selected.kind === "bank" ? "BANK" : "NETWORK"}
                </dt>
                <dd className="payment-detail-value">{selected.label}</dd>
              </div>
              <div className="payment-detail-row">
                <dt className="payment-detail-label">SEND TO</dt>
                <dd className="payment-number-wrap">
                  <span className="payment-number">{selected.number}</span>
                  <button
                    type="button"
                    onClick={copyNumber}
                    className="payment-copy-button"
                    aria-label={copied ? "Number copied" : "Copy payment number"}
                  >
                    {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                    {copied ? "COPIED" : "COPY"}
                  </button>
                </dd>
              </div>
              <div className="payment-detail-row">
                <dt className="payment-detail-label">ACCOUNT NAME</dt>
                <dd className="payment-detail-value">{selected.name || "—"}</dd>
              </div>
              <div className="payment-detail-row">
                <dt className="payment-detail-label">AMOUNT</dt>
                <dd className="payment-detail-value text-gold">
                  GHS {amount.toLocaleString("en-GH")}
                </dd>
              </div>
            </dl>

            <ol className="payment-steps mt-5">
              <li><span>1</span><p>Send <strong>GHS {amount.toLocaleString("en-GH")}</strong> using the details above.</p></li>
              <li><span>2</span><p>Upload a screenshot or receipt of the transfer.</p></li>
              <li><span>3</span><p>We’ll update this page once your payment is confirmed.</p></li>
            </ol>

            {paymentId ? null : (
              <form onSubmit={onSubmit} className="payment-receipt-form mt-6">
                <label htmlFor="receipt" className="payment-upload-label">
                  <span>
                    <strong>Upload payment receipt</strong>
                    <small>{receiptName || "Image or PDF · required to confirm transfer"}</small>
                  </span>
                  <ArrowRight className="size-5" aria-hidden />
                </label>
                <input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(event) => onReceipt(event.target.files?.[0])}
                  className="payment-file-input"
                />
                {error ? <p className="mt-2 text-sm text-red">{error}</p> : null}
                <button
                  type="submit"
                  disabled={!allowed || !receipt || sending || Boolean(paymentId)}
                  className="payment-submit mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-extrabold tracking-wide disabled:opacity-70"
                >
                  {sending ? (
                    <>
                      SENDING RECEIPT…
                      <LoaderCircle className="size-5 animate-spin" aria-hidden />
                    </>
                  ) : (
                    <>
                      I'VE SENT THE MONEY
                      <ArrowRight className="size-5" aria-hidden />
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </section>
    </main>
  );
}
