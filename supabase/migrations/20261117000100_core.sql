-- Upper Echelon · core schema: members, privacy, social graph, rate limits, helpers.
-- Conventions: every table has RLS enabled; helper functions are SECURITY DEFINER with an empty
-- search_path and fully qualified names; protected columns are guarded with column-level grants.

create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------------------------
create type public.member_role as enum ('member', 'moderator', 'admin');
create type public.visibility as enum ('everyone', 'followers', 'only_me');
create type public.dm_policy as enum ('everyone', 'following', 'no_one');
create type public.game_kind as enum ('reaction', 'sequence', 'aim', 'number', 'verbal', 'chimp', 'visual', 'typing');

-- ---------------------------------------------------------------------------------------------
-- Profiles (public face of a member)
-- ---------------------------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext not null unique
    constraint username_format check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  display_name text not null constraint display_name_length check (char_length(display_name) between 1 and 40),
  bio text constraint bio_length check (char_length(bio) <= 500),
  location text constraint location_length check (char_length(location) <= 60),
  pronouns text constraint pronouns_length check (char_length(pronouns) <= 30),
  interests text[] not null default '{}'
    constraint interests_count check (coalesce(array_length(interests, 1), 0) <= 12),
  links jsonb not null default '[]'::jsonb
    constraint links_shape check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 5),
  avatar_url text,
  banner_url text,
  theme text not null default 'pewter',
  showcase_badges text[] not null default '{}'
    constraint showcase_badges_count check (coalesce(array_length(showcase_badges, 1), 0) <= 6),
  showcase_games public.game_kind[] not null default '{}'
    constraint showcase_games_count check (coalesce(array_length(showcase_games, 1), 0) <= 4),
  role public.member_role not null default 'member',
  is_staff boolean not null default false,
  tier smallint not null default 1 constraint tier_range check (tier between 1 and 6),
  echelon_score integer not null default 0,
  mind_score integer not null default 0,
  practice_score integer not null default 0,
  voice_score integer not null default 0,
  reputation integer not null default 0,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_username_trgm on public.profiles using gin ((username::text) extensions.gin_trgm_ops);
create index profiles_echelon on public.profiles (echelon_score desc);

comment on table public.profiles is 'Public member profile. Sensitive data (date of birth) lives in profile_private.';

-- Private data that is never shown publicly.
create table public.profile_private (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  date_of_birth date,
  created_at timestamptz not null default now()
);

-- Per-member settings: privacy, notifications, preferences.
create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  game_stats_visibility public.visibility not null default 'everyone',
  test_results_visibility public.visibility not null default 'everyone',
  activity_visibility public.visibility not null default 'everyone',
  followers_visibility public.visibility not null default 'everyone',
  dm_policy public.dm_policy not null default 'following',
  notify_inapp jsonb not null default
    '{"reply": true, "mention": true, "follow": true, "tier": true, "achievement": true, "solution": true}'::jsonb,
  notify_email jsonb not null default
    '{"reply": false, "mention": true, "follow": false, "tier": true, "achievement": false, "solution": true, "message": true, "moderation": true}'::jsonb,
  reduced_motion boolean not null default false,
  grain boolean not null default true,
  high_contrast boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------------
-- Social graph
-- ---------------------------------------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint no_self_follow check (follower_id <> followee_id)
);
create index follows_followee on public.follows (followee_id);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);
create index blocks_blocked on public.blocks (blocked_id);

create table public.mutes (
  muter_id uuid not null references public.profiles (id) on delete cascade,
  muted_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  constraint no_self_mute check (muter_id <> muted_id)
);

-- ---------------------------------------------------------------------------------------------
-- Moderation primitives needed by helpers (full moderation schema lives in a later migration)
-- ---------------------------------------------------------------------------------------------
create table public.sanctions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null constraint sanction_kind check (kind in ('warning', 'mute', 'ban')),
  reason text not null constraint sanction_reason_length check (char_length(reason) between 3 and 1000),
  expires_at timestamptz,
  issued_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null
);
create index sanctions_user on public.sanctions (user_id, kind) where revoked_at is null;

-- ---------------------------------------------------------------------------------------------
-- Rate limiting (fixed windows, enforced inside the database so no client can bypass it)
-- ---------------------------------------------------------------------------------------------
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

create or replace function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, w, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into c;
  return c <= p_max;
end;
$$;

-- Raises SQLSTATE UE429 when the limit is exceeded. The app maps UE429 to a "rate limited" state.
create or replace function public.enforce_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.hit_rate_limit(p_key, p_max, p_window_seconds) then
    raise exception 'rate_limited' using errcode = 'UE429', hint = p_window_seconds::text;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Helper predicates used by policies
-- ---------------------------------------------------------------------------------------------
create or replace function public.is_moderator(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role in ('moderator', 'admin') from public.profiles where id = uid), false);
$$;

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.profiles where id = uid), false);
$$;

create or replace function public.member_tier(uid uuid default auth.uid())
returns smallint language sql stable security definer set search_path = '' as $$
  select coalesce((select tier from public.profiles where id = uid), 0::smallint);
$$;

create or replace function public.is_following(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.follows where follower_id = a and followee_id = b);
$$;

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function public.has_active_sanction(uid uuid, p_kind text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.sanctions
    where user_id = uid and kind = p_kind and revoked_at is null
      and (expires_at is null or expires_at > now())
  );
$$;

-- A member may write (post, reply, message, upload) when not banned and not muted.
create or replace function public.can_write(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select uid is not null
    and exists (select 1 from public.profiles where id = uid and onboarded_at is not null)
    and not public.has_active_sanction(uid, 'ban')
    and not public.has_active_sanction(uid, 'mute');
$$;

-- Can the current viewer see a privacy-controlled item of `owner`?
-- item: 'game_stats' | 'test_results' | 'activity' | 'followers'
create or replace function public.can_see(owner uuid, item text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  viewer uuid := auth.uid();
  v public.visibility;
begin
  if viewer is not null and viewer = owner then return true; end if;
  if public.is_moderator(viewer) then return true; end if;
  if viewer is not null and public.is_blocked_between(viewer, owner) then return false; end if;
  select case item
      when 'game_stats' then game_stats_visibility
      when 'test_results' then test_results_visibility
      when 'activity' then activity_visibility
      when 'followers' then followers_visibility
    end
    into v
  from public.user_settings where user_id = owner;
  if v is null then return false; end if;
  return case v
    when 'everyone' then true
    when 'followers' then viewer is not null and public.is_following(viewer, owner)
    else false
  end;
end;
$$;

-- Can `sender` start or continue a direct conversation with `recipient`?
create or replace function public.can_message(sender uuid, recipient uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  p public.dm_policy;
begin
  if sender is null or recipient is null or sender = recipient then return false; end if;
  if public.is_blocked_between(sender, recipient) then return false; end if;
  if public.is_moderator(sender) then return true; end if;
  -- A reply is always allowed once the recipient has written to the sender.
  if exists (
    select 1 from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.sender_id = recipient
      and ((c.user_a = sender and c.user_b = recipient) or (c.user_a = recipient and c.user_b = sender))
  ) then return true; end if;
  select dm_policy into p from public.user_settings where user_id = recipient;
  return case p
    when 'everyone' then true
    when 'following' then public.is_following(recipient, sender)
    else false
  end;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- New member bootstrap: runs when Supabase Auth creates a user (email sign-up or Google).
-- ---------------------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  wanted text := meta ->> 'username';
  uname text;
  dname text;
  dob date;
  ints text[];
begin
  if wanted is not null and wanted ~ '^[A-Za-z0-9_]{3,20}$'
     and not exists (select 1 from public.profiles where username = wanted::extensions.citext) then
    uname := wanted;
  else
    uname := 'member_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;

  dname := left(coalesce(nullif(trim(meta ->> 'display_name'), ''), nullif(trim(meta ->> 'full_name'), ''),
    nullif(trim(meta ->> 'name'), ''), uname), 40);

  begin
    dob := nullif(meta ->> 'date_of_birth', '')::date;
  exception when others then
    dob := null;
  end;
  if dob is not null and dob > (current_date - interval '13 years') then
    raise exception 'Members must be at least 13 years old.' using errcode = 'UE413';
  end if;

  select coalesce(array_agg(x), '{}') into ints
  from (select left(jsonb_array_elements_text(coalesce(meta -> 'interests', '[]'::jsonb)), 40) as x limit 12) s;

  insert into public.profiles (id, username, display_name, interests)
  values (new.id, uname, dname, ints);
  insert into public.profile_private (user_id, date_of_birth) values (new.id, dob);
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at maintenance
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.user_settings for each row execute function public.touch_updated_at();

-- Blocking someone removes follows in both directions.
create or replace function public.on_block_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end;
$$;
create trigger blocks_cleanup after insert on public.blocks for each row execute function public.on_block_created();

-- Follow rate limit and block check.
create or replace function public.before_follow()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_blocked_between(new.follower_id, new.followee_id) then
    raise exception 'You cannot follow this member.' using errcode = 'UE403';
  end if;
  perform public.enforce_rate_limit('follow:' || new.follower_id, 120, 3600);
  return new;
end;
$$;
create trigger follows_guard before insert on public.follows for each row execute function public.before_follow();

-- ---------------------------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.user_settings enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.mutes enable row level security;
alter table public.sanctions enable row level security;
alter table public.rate_limits enable row level security;

-- Profiles are public (privacy-sensitive parts are separate tables or privacy-checked functions).
create policy "Profiles are readable by everyone" on public.profiles for select using (true);
create policy "Members update their own profile" on public.profiles for update
  to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Only these columns can be changed by members themselves. Role, tier, scores and staff
-- flags change only through SECURITY DEFINER functions.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (username, display_name, bio, location, pronouns, interests, links, avatar_url, banner_url,
  theme, showcase_badges, showcase_games) on public.profiles to authenticated;

create policy "Members read their own private data" on public.profile_private for select
  to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.profile_private from anon, authenticated;

create policy "Members read their own settings" on public.user_settings for select
  to authenticated using (user_id = (select auth.uid()));
create policy "Members update their own settings" on public.user_settings for update
  to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke insert, delete on public.user_settings from anon, authenticated;

create policy "Follows visible when both lists are visible" on public.follows for select using (
  follower_id = (select auth.uid()) or followee_id = (select auth.uid())
  or (public.can_see(follower_id, 'followers') and public.can_see(followee_id, 'followers'))
);
create policy "Members follow as themselves" on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()));
create policy "Members unfollow as themselves" on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()));

create policy "Members see their own blocks" on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy "Members block as themselves" on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy "Members unblock as themselves" on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

create policy "Members see their own mutes" on public.mutes for select to authenticated
  using (muter_id = (select auth.uid()));
create policy "Members mute as themselves" on public.mutes for insert to authenticated
  with check (muter_id = (select auth.uid()));
create policy "Members unmute as themselves" on public.mutes for delete to authenticated
  using (muter_id = (select auth.uid()));

create policy "Members see their own sanctions; moderators see all" on public.sanctions for select
  to authenticated using (user_id = (select auth.uid()) or public.is_moderator());
revoke insert, update, delete on public.sanctions from anon, authenticated;
-- rate_limits: no policies → only service role and definer functions touch it.

-- Follower counts honour the followers privacy setting.
create or replace function public.follow_counts(uid uuid)
returns table (followers bigint, following bigint)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*) from public.follows where followee_id = uid),
    (select count(*) from public.follows where follower_id = uid)
  where public.can_see(uid, 'followers');
$$;

-- Username availability (used during the Initiation).
create or replace function public.username_available(p_username text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_username ~ '^[A-Za-z0-9_]{3,20}$'
    and lower(p_username) not in ('admin', 'administrator', 'moderator', 'staff', 'support', 'upperechelon',
      'echelon', 'root', 'system', 'official', 'help', 'settings', 'null', 'undefined', 'anonymous')
    and not exists (select 1 from public.profiles where username = p_username::extensions.citext);
$$;

-- Reserved usernames cannot be taken by renaming either.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.username is distinct from old.username then
    if not public.username_available(new.username::text) and auth.role() <> 'service_role' then
      raise exception 'That name is unavailable.' using errcode = 'UE409';
    end if;
    perform public.enforce_rate_limit('rename:' || new.id, 5, 86400);
  end if;
  if new.theme is distinct from old.theme then
    -- Profile themes are unlocked by tier: pewter I, bronze II, silver III, gold IV, platinum V, obsidian VI.
    if array_position(array['pewter', 'bronze', 'silver', 'gold', 'platinum', 'obsidian'], new.theme) is null then
      raise exception 'Unknown theme.' using errcode = 'UE400';
    end if;
    if array_position(array['pewter', 'bronze', 'silver', 'gold', 'platinum', 'obsidian'], new.theme) > new.tier
       and auth.role() <> 'service_role' and not public.is_admin() then
      raise exception 'That theme unlocks at a higher tier.' using errcode = 'UE403';
    end if;
  end if;
  return new;
end;
$$;
create trigger profiles_guard before update on public.profiles for each row execute function public.guard_profile_update();
