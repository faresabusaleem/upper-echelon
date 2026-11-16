-- Upper Echelon · safety and moderation: reports, sanctions, audit log, uploads, error log.

create type public.report_target as enum ('thread', 'post', 'profile', 'message', 'image', 'test_result');

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type public.report_target not null,
  target_id text not null,
  target_user_id uuid references public.profiles (id) on delete set null,
  reason text not null constraint report_reason check (reason in (
    'spam', 'harassment', 'hate', 'sexual', 'self_harm', 'minor_safety', 'violence', 'cheating', 'impersonation', 'other'
  )),
  details text constraint report_details_length check (char_length(details) <= 1000),
  snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'open' constraint report_status check (status in ('open', 'actioned', 'dismissed')),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index reports_open on public.reports (created_at) where status = 'open';
create unique index reports_one_open_per_reporter on public.reports (reporter_id, target_type, target_id) where status = 'open';

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  target_user_id uuid references public.profiles (id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_time on public.audit_log (created_at desc);

-- Every stored image, so it can be reported, removed and cleaned up.
create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  bucket text not null,
  path text not null unique,
  width integer,
  height integer,
  bytes integer,
  removed_at timestamptz,
  created_at timestamptz not null default now()
);
create index uploads_user on public.uploads (user_id, created_at desc);

create table public.error_logs (
  id bigint generated always as identity primary key,
  level text not null default 'error',
  message text not null,
  digest text,
  stack text,
  url text,
  user_id uuid,
  user_agent text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index error_logs_time on public.error_logs (created_at desc);

-- ---------------------------------------------------------------------------------------------
-- Reporting: the reporter must be able to see what they report; a snapshot is kept for review.
-- ---------------------------------------------------------------------------------------------
create or replace function public.before_report()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  snap jsonb;
  owner uuid;
begin
  new.reporter_id := auth.uid();
  new.status := 'open';
  if new.reporter_id is null then raise exception 'Sign in to report.' using errcode = 'UE401'; end if;
  perform public.enforce_rate_limit('report:' || new.reporter_id, 20, 3600);

  case new.target_type
    when 'thread' then
      select jsonb_build_object('title', t.title, 'body', left(t.body, 4000), 'thread_id', t.id), t.author_id
        into snap, owner
      from public.threads t where t.id = new.target_id::bigint and public.can_view_thread(t.id);
    when 'post' then
      select jsonb_build_object('body', left(p.body, 4000), 'thread_id', p.thread_id, 'post_id', p.id), p.author_id
        into snap, owner
      from public.posts p where p.id = new.target_id::bigint and public.can_view_thread(p.thread_id);
    when 'message' then
      select jsonb_build_object('body', left(m.body, 4000), 'conversation_id', m.conversation_id, 'message_id', m.id),
             m.sender_id
        into snap, owner
      from public.messages m where m.id = new.target_id::bigint and public.is_participant(m.conversation_id);
    when 'profile' then
      select jsonb_build_object('username', pr.username, 'display_name', pr.display_name, 'bio', pr.bio,
               'avatar_url', pr.avatar_url, 'banner_url', pr.banner_url), pr.id
        into snap, owner
      from public.profiles pr where pr.id = new.target_id::uuid;
    when 'image' then
      select jsonb_build_object('bucket', u.bucket, 'path', u.path), u.user_id into snap, owner
      from public.uploads u where u.path = new.target_id and u.removed_at is null;
    when 'test_result' then
      select jsonb_build_object('score', r.score, 'scale', r.scale, 'test_id', r.test_id, 'note', r.note,
               'proof_path', r.proof_path), r.user_id
        into snap, owner
      from public.test_results r where r.id = new.target_id::uuid;
  end case;

  if snap is null then
    raise exception 'Nothing to report.' using errcode = 'UE404';
  end if;
  if owner = new.reporter_id then
    raise exception 'You cannot report yourself.' using errcode = 'UE400';
  end if;
  new.snapshot := snap;
  new.target_user_id := owner;
  return new;
end;
$$;
create trigger reports_before_insert before insert on public.reports
  for each row execute function public.before_report();

-- ---------------------------------------------------------------------------------------------
-- Moderator actions (all audited)
-- ---------------------------------------------------------------------------------------------
create or replace function public.require_moderator()
returns uuid language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_moderator() then
    raise exception 'Moderators only.' using errcode = 'UE403';
  end if;
  return auth.uid();
end;
$$;

create or replace function public.log_action(p_action text, p_type text, p_id text, p_user uuid, p_details jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, action, target_type, target_id, target_user_id, details)
  values (auth.uid(), p_action, p_type, p_id, p_user, coalesce(p_details, '{}'::jsonb));
$$;

create or replace function public.mod_set_removed(p_type text, p_id text, p_removed boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_moderator();
  owner uuid;
begin
  if p_type = 'thread' then
    update public.threads set
      removed_at = case when p_removed then now() end,
      removed_by = case when p_removed then me end,
      removed_reason = case when p_removed then p_reason end
    where id = p_id::bigint returning author_id into owner;
  elsif p_type = 'post' then
    update public.posts set
      removed_at = case when p_removed then now() end,
      removed_by = case when p_removed then me end,
      removed_reason = case when p_removed then p_reason end
    where id = p_id::bigint returning author_id into owner;
  elsif p_type = 'message' then
    update public.messages set removed_at = case when p_removed then now() end
    where id = p_id::bigint returning sender_id into owner;
  elsif p_type = 'image' then
    update public.uploads set removed_at = case when p_removed then now() end
    where path = p_id returning user_id into owner;
    if p_removed then
      update public.profiles set avatar_url = null where avatar_url like '%' || p_id;
      update public.profiles set banner_url = null where banner_url like '%' || p_id;
    end if;
  elsif p_type = 'test_result' then
    update public.test_results set is_hidden = p_removed where id = p_id::uuid returning user_id into owner;
  else
    raise exception 'Unknown target.' using errcode = 'UE400';
  end if;
  if not found then raise exception 'Not found.' using errcode = 'UE404'; end if;
  perform public.log_action(case when p_removed then 'remove' else 'restore' end, p_type, p_id, owner,
    jsonb_build_object('reason', p_reason));
  if p_removed and owner is not null and p_type in ('thread', 'post', 'image') then
    perform public.notify(owner, 'moderation', null, null, null,
      jsonb_build_object('action', 'removed', 'target', p_type, 'reason', p_reason));
  end if;
end;
$$;

create or replace function public.mod_resolve_report(p_report bigint, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_moderator();
begin
  if p_status not in ('actioned', 'dismissed', 'open') then
    raise exception 'Unknown status.' using errcode = 'UE400';
  end if;
  update public.reports set status = p_status, resolved_by = case when p_status = 'open' then null else me end,
    resolution_note = p_note, resolved_at = case when p_status = 'open' then null else now() end
  where id = p_report;
  if not found then raise exception 'Report not found.' using errcode = 'UE404'; end if;
  perform public.log_action('report_' || p_status, 'report', p_report::text, null, jsonb_build_object('note', p_note));
end;
$$;

create or replace function public.mod_sanction(p_user uuid, p_kind text, p_reason text, p_hours integer default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_moderator();
  sid bigint;
  target_role public.member_role;
begin
  select role into target_role from public.profiles where id = p_user;
  if target_role is null then raise exception 'Member not found.' using errcode = 'UE404'; end if;
  if target_role <> 'member' and not public.is_admin() then
    raise exception 'Only administrators can sanction staff.' using errcode = 'UE403';
  end if;
  if p_user = me then raise exception 'You cannot sanction yourself.' using errcode = 'UE400'; end if;
  if p_kind not in ('warning', 'mute', 'ban') then raise exception 'Unknown sanction.' using errcode = 'UE400'; end if;
  insert into public.sanctions (user_id, kind, reason, expires_at, issued_by)
  values (p_user, p_kind, p_reason,
    case when p_kind = 'warning' then null when p_hours is null then null else now() + make_interval(hours => p_hours) end,
    me)
  returning id into sid;
  perform public.log_action('sanction_' || p_kind, 'member', p_user::text, p_user,
    jsonb_build_object('reason', p_reason, 'hours', p_hours, 'sanction_id', sid));
  perform public.notify(p_user, 'moderation', null, null, null,
    jsonb_build_object('action', p_kind, 'reason', p_reason, 'hours', p_hours));
  return sid;
end;
$$;

create or replace function public.mod_revoke_sanction(p_sanction bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_moderator();
  uid uuid;
begin
  update public.sanctions set revoked_at = now(), revoked_by = me
  where id = p_sanction and revoked_at is null returning user_id into uid;
  if not found then raise exception 'Sanction not found.' using errcode = 'UE404'; end if;
  perform public.log_action('sanction_revoked', 'member', uid::text, uid, jsonb_build_object('sanction_id', p_sanction));
end;
$$;

create or replace function public.mod_set_thread_flags(p_thread bigint, p_pinned boolean, p_locked boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_moderator();
begin
  update public.threads set is_pinned = coalesce(p_pinned, is_pinned), is_locked = coalesce(p_locked, is_locked)
  where id = p_thread;
  if not found then raise exception 'Thread not found.' using errcode = 'UE404'; end if;
  perform public.log_action('thread_flags', 'thread', p_thread::text, null,
    jsonb_build_object('pinned', p_pinned, 'locked', p_locked));
end;
$$;

create or replace function public.mod_move_thread(p_thread bigint, p_category smallint)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_moderator();
begin
  update public.threads set category_id = p_category where id = p_thread;
  if not found then raise exception 'Thread not found.' using errcode = 'UE404'; end if;
  perform public.log_action('thread_moved', 'thread', p_thread::text, null, jsonb_build_object('category', p_category));
end;
$$;

create or replace function public.admin_set_role(p_user uuid, p_role public.member_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrators only.' using errcode = 'UE403'; end if;
  if p_user = auth.uid() then raise exception 'You cannot change your own role.' using errcode = 'UE400'; end if;
  update public.profiles set role = p_role where id = p_user;
  if not found then raise exception 'Member not found.' using errcode = 'UE404'; end if;
  perform public.log_action('role_changed', 'member', p_user::text, p_user, jsonb_build_object('role', p_role));
end;
$$;

-- Moderators may read a member's sanction history and basic account facts.
create or replace function public.mod_member_overview(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_moderator();
  return jsonb_build_object(
    'profile', (select to_jsonb(p) - 'links' from public.profiles p where p.id = p_user),
    'sanctions', coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc) from public.sanctions s where s.user_id = p_user), '[]'),
    'reports_against', (select count(*) from public.reports r where r.target_user_id = p_user),
    'threads', (select count(*) from public.threads t where t.author_id = p_user),
    'replies', (select count(*) from public.posts po where po.author_id = p_user),
    'flagged_results', (select count(*) from public.game_results g where g.user_id = p_user and g.is_flagged)
  );
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------------------------
alter table public.reports enable row level security;
alter table public.audit_log enable row level security;
alter table public.uploads enable row level security;
alter table public.error_logs enable row level security;

create policy "Reporters see their reports; moderators see all" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_moderator());
create policy "Members file reports" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
revoke update, delete on public.reports from anon, authenticated;
revoke insert on public.reports from anon, authenticated;
grant insert (target_type, target_id, reason, details) on public.reports to authenticated;

create policy "Moderators read the audit log" on public.audit_log for select to authenticated
  using (public.is_moderator());
revoke insert, update, delete on public.audit_log from anon, authenticated;

create policy "Owners and moderators see uploads" on public.uploads for select to authenticated
  using (user_id = (select auth.uid()) or public.is_moderator());
revoke insert, update, delete on public.uploads from anon, authenticated;

create policy "Admins read error logs" on public.error_logs for select to authenticated
  using (public.is_admin());
revoke insert, update, delete on public.error_logs from anon, authenticated;
