# Setup, deployment and free tiers

## Run it locally

Requirements: Node 22 (`.nvmrc`), Docker Desktop.

```bash
npm install
npx supabase start            # Postgres, Auth, Storage, Realtime, Mailpit (first run pulls images)
cp .env.example .env.local    # paste the publishable and secret keys printed by `supabase start`
npm run seed:staff            # the official staff account, welcome threads, directory rooms
npm run dev                   # http://localhost:3000
```

Emails (confirmation, magic links, notifications) land in Mailpit at http://127.0.0.1:54324.
The human check uses Cloudflare’s always-pass test key locally.

Useful scripts: `npm run lint`, `npm run typecheck`, `npm test` (unit), `npm run test:integration`
(needs the local stack; see `.github/workflows/ci.yml` for the variables), `npm run db:reset`,
`npm run db:types`, `npm run brand:build`, `node scripts/screenshots.mjs`.

To make yourself an administrator locally:
`docker exec supabase_db_upper-echelon psql -U postgres -c "update profiles set role='admin' where username='you'"`.

## Deploy (all free tiers)

### 1. Supabase project
1. Create a project (Free plan) in the region closest to your members.
2. Link and push the schema:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
3. **Authentication → URL configuration**: Site URL `https://<your-app>.vercel.app`; redirect URLs
   `https://<your-app>.vercel.app/**`.
4. **Authentication → Email**: enable *Confirm email*, *Secure password change*; minimum password
   length 10 with letters and digits. Paste the four templates from `supabase/templates/` (subjects in
   `supabase/config.toml`).
5. **Authentication → SMTP**: required for production (the built-in sender only reaches your own team,
   2 emails an hour). Brevo: SMTP host `smtp-relay.brevo.com`, port 587, your Brevo login and an SMTP
   key; sender = an address you verified in Brevo.
6. **Authentication → Multi-factor**: enable TOTP.
7. **Authentication → Providers → Google** (optional): create an OAuth client in Google Cloud
   (*Web application*; authorised redirect URI `https://<ref>.supabase.co/auth/v1/callback`), paste the
   client id and secret, then set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` in Vercel.
8. Run the staff seed against production once:
   `STAFF_EMAIL=you@example.com NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SECRET_KEY=… node scripts/seed-staff.mjs`
   then set your own account to `admin` in the SQL editor:
   `update profiles set role = 'admin' where username = 'you';`

### 2. Cloudflare Turnstile
Create a widget (Managed) for your Vercel hostname; copy the site key and secret.

### 3. Vercel
Import the GitHub repository (every push to `main` deploys). Environment variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://<your-app>.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API keys → publishable |
| `SUPABASE_SECRET_KEY` | Supabase → secret key (server only) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | from Cloudflare |
| `CRON_SECRET` | a long random string (Vercel sends it to `/api/cron/daily`) |
| `IP_HASH_SALT` | another long random string |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | the same SMTP account, for notification emails |
| `CONTACT_EMAIL` | shown on the contact and privacy pages |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | `true` once Google is configured |

Enable **Web Analytics** and **Speed Insights** in the Vercel project (both free on Hobby).

### 4. GitHub
Actions run CI on every push and pull request. For weekly database backups add the `SUPABASE_DB_URL`
secret (see `docs/backups.md`).

## Free tiers: what fits and what does not

Checked against each provider’s official pricing or documentation in November 2026.

| Service | Free allowance | Fits? |
|---|---|---|
| **Vercel Hobby** | 1 M function invocations, 4 CPU-hours active CPU, 360 GB-hours memory, 100 GB fast data transfer, 1 M CDN requests, 5,000 image transformations, 50,000 Web Analytics events/month, 10,000 Speed Insights events/30 days, cron once per day, 1 hour of runtime logs, **non-commercial use only** | Yes for a non-commercial community. Errors are also stored in our own table, so the 1-hour log window is not a problem. Commercial use (ads, paid tiers) would need Pro. |
| **Supabase Free** | 500 MB database, 1 GB file storage, 5 GB egress + 5 GB cached egress, 50,000 monthly active users, 200 concurrent realtime connections, 2 M realtime messages, 2 active projects, 50 MB max upload | Yes. Images are re-encoded to small WebP (avatars ~30 KB, forum images ~100–250 KB). **Limits to watch:** no automatic backups (we run our own weekly dump); projects pause after a week without activity (the daily cron touches the database every day); 200 concurrent realtime connections caps simultaneous live viewers. |
| **Supabase built-in email** | 2 emails/hour, team members only | **No.** Use custom SMTP (below). |
| **Brevo Free** | 300 emails/day (per Brevo’s free SMTP page); verified single sender, no domain needed | Yes for confirmations, resets and opted-in notifications at this scale. Confirm the sender and account approval in Brevo’s dashboard. |
| Resend Free (alternative) | 3,000 emails/month, 100/day, needs a verified domain | Only if you own a domain. |
| **Cloudflare Turnstile** | Unlimited challenges, 20 widgets, 10 hostnames per widget | Yes. |
| **Google sign-in** | Free (Google Cloud OAuth consent screen) | Yes. |
| **GitHub** | Free repositories; Actions minutes free for public repositories, 2,000/month for private | Yes (CI takes a few minutes per push). |
| Custom domain | Not free | Use the free `*.vercel.app` address, or add a domain later. |
