-- Upper Echelon · storage buckets, realtime publication, housekeeping.

-- Buckets. Writes happen only through the server upload route, which re-encodes every image
-- (stripping EXIF and location data) before storing it with the service role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/webp']),
  ('banners', 'banners', true, 3145728, array['image/webp']),
  ('forum', 'forum', true, 4194304, array['image/webp']),
  ('proofs', 'proofs', false, 4194304, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No insert/update/delete policies on storage.objects for members: only the service role writes.
-- Public buckets are read through their public URLs; proofs are read through short-lived signed URLs.

-- Realtime: new replies, direct messages and notifications stream to subscribed clients (RLS applies).
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;

-- Housekeeping, run daily by the Vercel cron route (/api/cron/daily) with the service role.
create or replace function public.daily_maintenance()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  rl integer;
  gs integer;
  logs integer;
  outbox integer;
  unconfirmed integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Server only.' using errcode = 'UE403';
  end if;
  delete from public.rate_limits where window_start < now() - interval '2 days';
  get diagnostics rl = row_count;
  delete from public.game_sessions where started_at < now() - interval '1 day';
  get diagnostics gs = row_count;
  delete from public.error_logs where created_at < now() - interval '30 days';
  get diagnostics logs = row_count;
  delete from public.email_outbox where created_at < now() - interval '30 days' and status <> 'pending';
  get diagnostics outbox = row_count;
  -- Sign-ups never confirmed within 7 days are removed with everything attached to them.
  delete from auth.users where email_confirmed_at is null and created_at < now() - interval '7 days'
    and coalesce(raw_app_meta_data ->> 'provider', 'email') = 'email';
  get diagnostics unconfirmed = row_count;
  return jsonb_build_object('rate_limits', rl, 'game_sessions', gs, 'error_logs', logs, 'outbox', outbox,
    'unconfirmed_users', unconfirmed);
end;
$$;
revoke execute on function public.daily_maintenance() from anon, authenticated, public;
