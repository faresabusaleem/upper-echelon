# Build status (work in progress)

## Done, tested locally
- Brand: vectorised logo (`brand/`), geometric mark, favicon/app icons, archive imagery with credits.
- Database: 9 migrations (RLS everywhere, rate limits, anti-cheat sessions, tiers, achievements,
  forum, messaging, notifications, moderation RPCs, storage buckets, reference data incl. 16 Directory tests).
- App shell, landing page, auth (join → email confirm → Initiation, sign-in, magic link, Google-ready,
  2FA, reset), image uploads (server re-encode, metadata stripped), member desk, Arena (8 games,
  server-side scoring), profiles, settings (profile, account, security/2FA, privacy, notifications,
  appearance, export, delete). 40 unit tests pass; `tsc` clean.

## Still to build
- Leaderboards page, Directory pages + result logging + admin CRUD, Forum (list, thread, editor with
  markdown/KaTeX/images/polls/drafts, realtime, search, tags, bookmarks), Messages, Notifications page,
  Moderation dashboard + admin, legal pages (about, guidelines, privacy, terms, cookies, contact), banned page,
  OG images, sitemap/robots/manifest/service worker, `/api/log`, `/api/cron/daily`, staff seed script,
  CI workflow, docs (brand.md, scoring.md, setup/free tiers, backups), README with screenshots.
- GitHub repo + Vercel deploy + Supabase cloud project (needs the owner's accounts/keys).

## Run locally
`npx supabase start`, copy `.env.example` → `.env.local` with the printed keys, `npm run dev`.
