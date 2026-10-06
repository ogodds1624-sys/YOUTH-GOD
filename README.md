# Casino Room

A responsive casino dashboard for game outcome predictions, user management, payment tracking, and referrals.

## Admin access

Configure `ADMIN_PASSCODE` as a random passphrase of at least 16 characters and
`ADMIN_SESSION_SECRET` as a random secret of at least 32 bytes in the server
environment. Do not use `VITE_`-prefixed variables for these values; those are
exposed to the browser. The admin passphrase is verified on the server, and
admin-only server functions require its signed, HTTP-only session cookie.
Copy `.env.example` to `.env` for local development and replace both placeholders
with private values. Set the same variables in the deployment platform before
using the admin panel.
