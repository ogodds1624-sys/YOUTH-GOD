# Casino World

A responsive casino dashboard for game outcome predictions, user management, payment tracking, and referrals.

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
