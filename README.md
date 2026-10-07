# Casino World

A responsive casino dashboard for game outcome predictions, user management, payment tracking, and referrals.

## Account activation

After connecting a SportyBet number, users must pay a one-time activation fee:
GHS 50 in Ghana or NGN 7,000 in Nigeria. The activation page reuses the configured
MoMo/bank transfer details and requires a receipt. Admin approval unlocks session
packages; activation alone does not start or purchase a timed session. This
requirement also applies to previously connected accounts.

Activation payments appear in admin transactions as **One-time activation fee**.
Pending payments resume across visits, and rejected payments can be resubmitted.
Approved activation fees are included alongside session payments in the existing
daily and total revenue figures for their currency, without a separate activation
revenue section. They follow the existing referral rules and test-account revenue
exclusion. Pending and rejected fees do not count. Migration `0008_activation_payments.sql`
preserves existing payments as session purchases and prevents duplicate pending
or approved activation payments for the same account.
Package checkout and session access require server-confirmed activation; changing
the URL or local session storage does not unlock this stage. Receipt submission
locks on the first tap and immediately shows sending feedback. Referral recording
is handled by the payment request rather than a separate blocking request.

## Session connection popups

The accounts `Ygodds18@gmail.com` and `Casinoworld@gmail.com` are exempt from timed
connection-issue popups on the 3-, 10-, and 15-minute plans (case-insensitive email
match). Their session timers and revenue exclusion are unchanged.
Other accounts keep the existing popup schedules.

## Test-account payment approval

Activation and session payments submitted by `Ygodds18@gmail.com` or
`Casinoworld@gmail.com` are automatically
approved in the database (case-insensitive email match). Receipts and transaction
records are retained, the admin **TEST ACCOUNT** label remains visible, and these
payments never count toward daily, total, or partner revenue. Activation is still
a separate required payment before session purchases. Migration
`0009_auto_approve_test_account.sql` also approves this account's existing pending
payments; rejected payments remain rejected. All other accounts still require
admin approval.
Migration `0010_casinoworld_test_account.sql` extends this behavior to
`Casinoworld@gmail.com`, excludes its existing payments from revenue, and approves
its pending payments. Both accounts must still upload a receipt and tap
**I've sent the money**; merely opening activation does not activate an account.

## Admin access

Configure `ADMIN_PASSCODE` with at least 6 characters and
`ADMIN_SESSION_SECRET` as a random secret of at least 32 bytes in the server
environment. Six-character numeric codes are substantially weaker than long,
random passcodes; use a longer passcode and deployment-level login throttling
for any publicly accessible deployment. Do not use `VITE_`-prefixed variables
for these values; those are exposed to the browser. The admin passcode is
verified on the server, and admin-only server functions require its signed,
HTTP-only session cookie. Copy `.env.example` to `.env` for local development
and replace both placeholders with private values. Set the same variables in
the deployment platform before using the admin panel.

## Partner payouts

Approved partners can request a payout in GHS or NGN for confirmed payments
from the previous local calendar day (Ghana time for GHS and Nigeria time for
NGN). The available amount is net of the partner's commission and any pending
or paid payout for that settlement day. Partners provide a bank or mobile-money
provider, account name, and account number in the partner dashboard. Admins
review requests under **Partner Payouts** and mark them paid or rejected;
rejected requests release that day's earnings. Admin payout requests include a
saved earnings breakdown showing gross revenue, the commission rate and amount,
net partner earnings, and the amount requested for verification before payment.
