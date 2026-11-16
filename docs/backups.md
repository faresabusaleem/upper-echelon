# Backups and restore

The Supabase **Free** plan does **not** include automatic backups (checked on supabase.com/pricing,
November 2026). Upper Echelon therefore backs itself up.

## Automatic weekly backup (GitHub Actions, free)

`.github/workflows/backup.yml` runs every Monday at 04:00 UTC (and on demand). It dumps the schema,
the data and the auth users with the Supabase CLI and stores them as a compressed workflow artifact,
kept for 30 days.

To enable it, add one repository secret:

1. Supabase dashboard → your project → **Connect** → copy the **Session pooler** connection string
   (it includes the database password).
2. GitHub → repository → **Settings → Secrets and variables → Actions → New repository secret**
   named `SUPABASE_DB_URL` with that string.

The workflow skips itself (and says so) while the secret is missing. Artifacts of private repositories
count towards GitHub’s free storage (500 MB); a dump of a young community is a few megabytes.

Images in Storage are not included in the database dump. To keep copies, download the `avatars`,
`banners`, `forum` and `proofs` buckets from the dashboard or with `supabase storage cp -r`.

## Manual backup

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db dump -f backup-schema.sql
npx supabase db dump --data-only -f backup-data.sql
```

## Restore

Into a fresh project (or a local stack):

```bash
psql "$DATABASE_URL" -f backup-schema.sql
psql "$DATABASE_URL" -f backup-data.sql
```

For a new project, prefer `npx supabase db push` (applies the migrations in `supabase/migrations`)
and then load only `backup-data.sql`. Test a restore into the local stack (`npx supabase start`) at
least once a quarter.
