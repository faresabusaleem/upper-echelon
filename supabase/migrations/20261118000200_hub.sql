-- Upper Echelon · the hub: board sections, message counts, thread views, presence ("who is here"),
-- board statistics, and the Circle (a site-wide shoutbox).

-- ---------------------------------------------------------------------------------------------
-- Sections group the rooms on the board index.
-- ---------------------------------------------------------------------------------------------
create table public.forum_sections (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  description text not null default '',
  position smallint not null default 0
);
alter table public.forum_sections enable row level security;
create policy "Sections are public" on public.forum_sections for select using (true);
revoke all on public.forum_sections from anon, authenticated;
grant select on public.forum_sections to anon, authenticated;

alter table public.forum_categories add column section_id smallint references public.forum_sections (id) on delete set null;
-- A key into the sigil set drawn by the app (src/components/ui/sigils.tsx).
alter table public.forum_categories add column icon text not null default 'quill';

insert into public.forum_sections (slug, name, description, position) values
  ('society', 'The Society', 'Notices from the staff, and the first words of every new member.', 1),
  ('study', 'The Study', 'Measurement, tests and the serious subjects.', 2),
  ('parlour', 'The Parlour', 'Puzzles, books, counsel and everything else.', 3),
  ('sanctum', 'The Sanctum', 'Rooms that open as you rise.', 4);

update public.forum_categories c set section_id = s.id, icon = v.icon
from (values
  ('notice-board', 'society', 'seal'),
  ('introductions', 'society', 'hand'),
  ('psychometrics', 'study', 'scale'),
  ('test-discussions', 'study', 'ledger'),
  ('mathematics', 'study', 'compass'),
  ('science', 'study', 'flask'),
  ('philosophy', 'study', 'lamp'),
  ('puzzles', 'parlour', 'key'),
  ('books', 'parlour', 'book'),
  ('advice', 'parlour', 'candle'),
  ('off-topic', 'parlour', 'chalice'),
  ('inner-room', 'sanctum', 'eye')
) as v (slug, section, icon)
join public.forum_sections s on s.slug = v.section
where c.slug = v.slug;

update public.forum_categories
set name = 'The Inner Sanctum', description = 'A quieter room for members of the third tier, Fellow, and above.'
where slug = 'inner-room';

-- ---------------------------------------------------------------------------------------------
-- Message counts (threads + replies that are not removed), shown beside every post.
-- ---------------------------------------------------------------------------------------------
alter table public.profiles add column message_count integer not null default 0;

create or replace function public.bump_message_count()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  uid uuid;
  delta integer := 0;
begin
  if tg_op = 'INSERT' then
    uid := new.author_id;
    if new.removed_at is null then delta := 1; end if;
  elsif tg_op = 'DELETE' then
    uid := old.author_id;
    if old.removed_at is null then delta := -1; end if;
  else
    uid := new.author_id;
    if old.removed_at is null and new.removed_at is not null then delta := -1;
    elsif old.removed_at is not null and new.removed_at is null then delta := 1;
    end if;
  end if;
  if uid is not null and delta <> 0 then
    update public.profiles set message_count = greatest(0, message_count + delta) where id = uid;
  end if;
  return null;
end;
$$;
create trigger threads_message_count after insert or delete or update of removed_at on public.threads
  for each row execute function public.bump_message_count();
create trigger posts_message_count after insert or delete or update of removed_at on public.posts
  for each row execute function public.bump_message_count();
revoke execute on function public.bump_message_count() from anon, authenticated, public;

update public.profiles p set message_count =
  (select count(*) from public.threads t where t.author_id = p.id and t.removed_at is null)
  + (select count(*) from public.posts x where x.author_id = p.id and x.removed_at is null);

-- ---------------------------------------------------------------------------------------------
-- Thread views, counted by the server when a thread page is rendered.
-- ---------------------------------------------------------------------------------------------
alter table public.threads add column view_count integer not null default 0;

create or replace function public.count_thread_view(tid bigint)
returns void language sql security definer set search_path = '' as $$
  update public.threads set view_count = view_count + 1 where id = tid and removed_at is null;
$$;
revoke execute on function public.count_thread_view(bigint) from anon, authenticated, public;
grant execute on function public.count_thread_view(bigint) to service_role;

create or replace view public.thread_list
with (security_invoker = true) as
select
  t.id, t.category_id, t.author_id, t.title, t.tags, t.is_pinned, t.is_locked, t.is_official,
  t.solved_post_id, t.score, t.reply_count, t.last_activity_at, t.created_at, t.removed_at,
  t.directory_test_id,
  c.slug as category_slug, c.name as category_name, c.min_tier as category_min_tier,
  a.username as author_username, a.display_name as author_name, a.avatar_url as author_avatar, a.tier as author_tier,
  lr.username as last_reply_username, lr.display_name as last_reply_name,
  exists (select 1 from public.polls p where p.thread_id = t.id) as has_poll,
  t.view_count,
  lr.avatar_url as last_reply_avatar, lr.tier as last_reply_tier
from public.threads t
join public.forum_categories c on c.id = t.category_id
left join public.profiles a on a.id = t.author_id
left join public.profiles lr on lr.id = t.last_reply_by;
grant select on public.thread_list to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- The board index: every room with its section, and (only for rooms the caller may enter) its
-- counts and latest activity. Locked rooms are listed so members can see what rising opens.
-- ---------------------------------------------------------------------------------------------
create or replace function public.forum_index()
returns table (
  category_id smallint, slug text, name text, description text, icon text, min_tier smallint,
  staff_only boolean, cat_position smallint,
  section_slug text, section_name text, section_description text, section_position smallint,
  can_view boolean, threads bigint, messages bigint,
  last_thread_id bigint, last_thread_title text, last_activity_at timestamptz,
  last_username text, last_display_name text, last_avatar_url text, last_tier smallint
)
language sql stable security definer set search_path = '' as $$
  select
    c.id, c.slug, c.name, c.description, c.icon, c.min_tier, c.staff_only, c.position,
    s.slug, s.name, s.description, s.position,
    v.ok,
    case when v.ok then (select count(*) from public.threads t where t.category_id = c.id and t.removed_at is null) end,
    case when v.ok then (select (count(*) + coalesce(sum(t.reply_count), 0))::bigint
       from public.threads t where t.category_id = c.id and t.removed_at is null) end,
    lt.id, lt.title, lt.last_activity_at,
    lp.username::text, lp.display_name, lp.avatar_url, lp.tier
  from public.forum_categories c
  left join public.forum_sections s on s.id = c.section_id
  cross join lateral (select public.can_view_category(c.id) as ok) v
  left join lateral (
    select t.id, t.title, t.last_activity_at, coalesce(t.last_reply_by, t.author_id) as who
    from public.threads t
    where v.ok and t.category_id = c.id and t.removed_at is null
    order by t.last_activity_at desc
    limit 1
  ) lt on true
  left join public.profiles lp on lp.id = lt.who
  order by s.position nulls last, c.position;
$$;
grant execute on function public.forum_index() to anon, authenticated;

create or replace function public.forum_stats()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'threads', (select count(*) from public.threads where removed_at is null),
    'messages', (select count(*) from public.threads where removed_at is null)
              + (select count(*) from public.posts where removed_at is null),
    'members', (select count(*) from public.profiles where onboarded_at is not null and not is_staff),
    'newest', (select jsonb_build_object('username', username::text, 'display_name', display_name)
               from public.profiles where onboarded_at is not null and not is_staff
               order by onboarded_at desc limit 1)
  );
$$;
grant execute on function public.forum_stats() to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Presence: who is here. Written by the server only (members by id, visitors by a salted IP
-- hash), read only through online_now(), which respects each member's "show me online" setting.
-- ---------------------------------------------------------------------------------------------
create table public.presence (
  key text primary key,
  user_id uuid references public.profiles (id) on delete cascade,
  last_seen_at timestamptz not null default now()
);
create index presence_recent on public.presence (last_seen_at desc);
alter table public.presence enable row level security;
revoke all on public.presence from anon, authenticated;

alter table public.user_settings add column show_online boolean not null default true;

create or replace function public.record_presence(p_key text, p_user uuid default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.presence (key, user_id, last_seen_at) values (p_key, p_user, now())
  on conflict (key) do update set last_seen_at = excluded.last_seen_at, user_id = excluded.user_id
  where public.presence.last_seen_at < now() - interval '90 seconds';
$$;
revoke execute on function public.record_presence(text, uuid) from anon, authenticated, public;
grant execute on function public.record_presence(text, uuid) to service_role;

create or replace function public.online_now(lim integer default 40)
returns jsonb language sql stable security definer set search_path = '' as $$
  with recent as (
    select key, user_id, last_seen_at from public.presence where last_seen_at > now() - interval '15 minutes'
  ),
  shown as (
    select p.username::text as username, p.display_name, p.avatar_url, p.tier, p.role::text as role, r.last_seen_at
    from recent r
    join public.profiles p on p.id = r.user_id
    join public.user_settings s on s.user_id = p.id
    where s.show_online and p.onboarded_at is not null
    order by r.last_seen_at desc
    limit least(greatest(lim, 1), 100)
  )
  select jsonb_build_object(
    'members', (select count(*) from recent where user_id is not null),
    'guests', (select count(*) from recent where user_id is null),
    'list', coalesce((select jsonb_agg(to_jsonb(shown) order by shown.last_seen_at desc) from shown), '[]'::jsonb)
  );
$$;
grant execute on function public.online_now(integer) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- The Circle: a short, live, site-wide chat. Members only; rate limited; moderated like posts.
-- ---------------------------------------------------------------------------------------------
create table public.shouts (
  id bigint generated always as identity primary key,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references public.profiles (id) on delete set null
);
create index shouts_recent on public.shouts (created_at desc);
alter table public.shouts enable row level security;
create policy "The Circle is public" on public.shouts for select
  using (removed_at is null or public.is_moderator());
create policy "Members speak as themselves" on public.shouts for insert to authenticated
  with check (author_id = (select auth.uid()));
revoke all on public.shouts from anon, authenticated;
grant select on public.shouts to anon, authenticated;
grant insert (body) on public.shouts to authenticated;

create or replace function public.before_shout_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.author_id := auth.uid();
  new.body := btrim(regexp_replace(new.body, '\s+', ' ', 'g'));
  new.created_at := now();
  new.removed_at := null;
  new.removed_by := null;
  if new.author_id is null then
    raise exception 'Sign in to speak in the Circle.' using errcode = 'UE401';
  end if;
  if not exists (select 1 from public.profiles where id = new.author_id and onboarded_at is not null) then
    raise exception 'Finish your initiation first.' using errcode = 'UE403';
  end if;
  if not public.can_write(new.author_id) then
    raise exception 'Your account cannot post right now.' using errcode = 'UE403';
  end if;
  if char_length(new.body) = 0 then
    raise exception 'Say something first.' using errcode = 'UE400';
  end if;
  perform public.enforce_rate_limit('shout:' || new.author_id, 6, 60);
  perform public.enforce_rate_limit('shout1h:' || new.author_id, 120, 3600);
  return new;
end;
$$;
create trigger shouts_before_insert before insert on public.shouts
  for each row execute function public.before_shout_insert();
revoke execute on function public.before_shout_insert() from anon, authenticated, public;

alter publication supabase_realtime add table public.shouts;

-- Reports and moderator removal learn about shouts.
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
    when 'shout' then
      select jsonb_build_object('body', s.body, 'shout_id', s.id), s.author_id into snap, owner
      from public.shouts s where s.id = new.target_id::bigint and s.removed_at is null;
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
revoke execute on function public.before_report() from anon, authenticated, public;

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
  elsif p_type = 'shout' then
    update public.shouts set
      removed_at = case when p_removed then now() end,
      removed_by = case when p_removed then me end
    where id = p_id::bigint returning author_id into owner;
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
revoke execute on function public.mod_set_removed(text, text, boolean, text) from anon, public;

-- Housekeeping now also trims the Circle and stale presence.
create or replace function public.daily_maintenance()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  rl integer;
  gs integer;
  logs integer;
  outbox integer;
  unconfirmed integer;
  shouts integer;
  seen integer;
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
  delete from public.shouts where created_at < now() - interval '30 days';
  get diagnostics shouts = row_count;
  delete from public.presence where last_seen_at < now() - interval '1 day';
  get diagnostics seen = row_count;
  return jsonb_build_object('rate_limits', rl, 'game_sessions', gs, 'error_logs', logs, 'outbox', outbox,
    'unconfirmed_users', unconfirmed, 'shouts', shouts, 'presence', seen);
end;
$$;
revoke execute on function public.daily_maintenance() from anon, authenticated, public;
