# Architecture

## Stack, and why

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, React 19, TypeScript, Turbopack) | Server Components keep data access on the server and pages fast; Server Actions give type-safe mutations without a separate API; first-class on Vercel. Cache Components is turned off because nearly every page depends on the signed-in member. |
| Data, auth, storage, realtime | **Supabase** (Postgres 17) | One free service covers the database, email/password, magic-link and Google sign-in, TOTP 2FA, image storage and realtime. Row-level security lets the database enforce permissions no matter which client calls it. |
| Styling | **Tailwind CSS v4** with design tokens in `@theme` | The whole brand lives in one CSS file; no runtime CSS-in-JS. |
| Validation | **Zod 4** | Shared schemas for forms, actions and game payloads. |
| Markdown | unified: remark-gfm, remark-math, rehype-sanitize, rehype-katex | Safe server-side rendering with maths. |
| Images | **sharp** on the server, react-easy-crop in the browser | Re-encoding strips EXIF/GPS; cropping for avatars and banners. |
| Email | Supabase Auth (+ custom SMTP) for auth mail; nodemailer + SMTP for notifications | Works with any free SMTP provider (Brevo recommended). |
| Bot check | **Cloudflare Turnstile** | Free, private, no puzzles for most people. |
| Observability | Vercel Web Analytics + Speed Insights (cookieless); `error_logs` table fed by error boundaries and `onRequestError` | No extra accounts or cookies. |
| Tests | Vitest (unit + integration against a real Supabase), ESLint with React Compiler rules, `tsc` | CI on GitHub Actions. |

## Layout

```
src/
  app/
    page.tsx                 landing (split stage)
    (auth)/                  join, login, 2FA, reset, initiation, banned (focused frame)
    (main)/                  everything with the site header: arena, leaderboards, directory,
                             forum, u/[username], messages, notifications, settings, mod, admin,
                             about and legal pages
    api/                     games/start, games/submit, upload, account/export, log, cron/daily, og/*
    auth/                    confirm (email links), callback (OAuth), signout
    sitemap.ts robots.ts manifest.ts opengraph-image.tsx offline/
  components/                ui/, brand/, arena/, forum/, social/, settings/, mod/, landing/ …
  lib/
    auth.ts                  data access layer: getViewer (cached per request), requireViewer/Moderator/Admin
    supabase/                server, browser, admin (service role) clients; generated types
    games/                   catalogue, engines, anti-cheat evaluation, passages, words
    markdown.ts tiers.ts validation.ts email.ts errors.ts …
  proxy.ts                   session refresh + optimistic route protection (Next 16 "proxy")
supabase/migrations/         schema, RLS, triggers, functions, reference data
scripts/                     brand builders, staff seed, screenshots
tests/unit, tests/integration
```

## Security model

- **Row-level security on every table.** Policies decide who can read or change each row, so the
  browser can talk to Supabase directly (realtime, uploads metadata) without bypassing rules.
- **Column-level grants.** Members can update only harmless columns of their own profile (no `role`,
  `tier`, scores, `is_staff`), only `title/body/tags` of their threads, only `read_at` of notifications.
- **Triggers own the facts.** Author ids come from `auth.uid()`; scores, reputation, reply counts,
  bests, practice days, tiers, achievements and notifications are written by `SECURITY DEFINER`
  functions with an empty `search_path`.
- **Server-only writes** for game results, images and account deletion use the service role, and only
  after the caller has been authorised in code.
- **Rate limits in the database** (`enforce_rate_limit`): threads (4 / 10 min, 20 / day), replies
  (10 / 5 min), messages (12 / min), follows, votes, reports, logged results, renames; sign-ups, sign-in,
  magic links and resets by hashed IP; uploads 30 / hour.
- **Privacy** is checked by `can_see(owner, item)` (everyone / followers / only me) and
  `can_message(sender, recipient)` (everyone / people I follow / no one; replies always allowed;
  blocks always win). Dates of birth live in a table only the owner can read.
- **Sanctions**: warnings, mutes (no posting or messages) and bans (no access) with expiry; every
  moderator action goes through an audited RPC.
- **Content**: Markdown is rendered on the server and sanitised; raw HTML is dropped; images are only
  allowed from our storage (no tracking pixels); external links get `rel="nofollow ugc noopener"`.
- **Headers**: HSTS, `X-Frame-Options: DENY`, `nosniff`, a restrictive `Permissions-Policy`, and a CSP
  that forbids plugins, framing and foreign form targets.

## Data flow of a game

1. Member presses *Begin* → `POST /api/games/start` → `game_sessions` row (service role).
2. The game runs entirely in the browser; raw timings are kept.
3. `POST /api/games/submit` with the session id and raw details → session consumed atomically →
   `evaluate()` recomputes and checks → insert into `game_results` (flagged or not).
4. Triggers update `game_bests`, `member_days`, the Echelon score, the tier, achievements and
   notifications; the response returns the percentile, personal-best flag and streak.

## Realtime

Supabase Realtime (`postgres_changes`, RLS-aware) streams new replies on a thread (“2 new replies ·
show”), new direct messages in a conversation, and new notifications for the header counters.

## Email

Auth emails (confirmation, magic link, recovery, email change) use the branded templates in
`supabase/templates/`. Notification emails go through an outbox table (`email_outbox`) filled by the
`notify()` function according to each member’s preferences; they are sent right after the request that
caused them (`after()`), and the daily cron sends anything left.

## Accessibility and performance

Semantic landmarks, skip link, visible gold focus rings, labels on every control, keyboard play for
every trial, `aria-live` regions for game state and live updates, AA contrast, reduced-motion support
(OS and per-member). Fonts are self-hosted by `next/font`; heavy game code is split per trial with
`next/dynamic`; images are WebP/AVIF through `next/image`; nothing blocks first paint.
