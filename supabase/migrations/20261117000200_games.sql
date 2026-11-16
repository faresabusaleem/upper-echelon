-- Upper Echelon · the Arena: results, personal bests, practice days, sessions, leaderboards.
-- Results are written only by the server (service role) after validation in src/lib/games.

create or replace function public.game_lower_is_better(g public.game_kind)
returns boolean language sql immutable set search_path = '' as $$
  select g in ('reaction', 'aim');
$$;

-- One game is featured each day. Deterministic, so everyone shares the same challenge.
create or replace function public.daily_game(d date default (now() at time zone 'utc')::date)
returns public.game_kind language sql immutable set search_path = '' as $$
  select (enum_range(null::public.game_kind))[1 + ((d - date '2026-01-01') % 8 + 8) % 8];
$$;

-- Server-issued start tokens: a result is accepted only against an unused session that is old enough
-- for the claimed performance to be physically possible.
create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game public.game_kind not null,
  started_at timestamptz not null default now(),
  consumed_at timestamptz
);
create index game_sessions_user on public.game_sessions (user_id, started_at desc);

create table public.game_results (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  game public.game_kind not null,
  score numeric(10, 2) not null,
  rating smallint not null constraint rating_range check (rating between 0 and 100),
  details jsonb not null default '{}'::jsonb,
  is_daily boolean not null default false,
  is_flagged boolean not null default false,
  flag_reason text,
  created_at timestamptz not null default now()
);
create index game_results_user_game on public.game_results (user_id, game, created_at desc);
create index game_results_game_time on public.game_results (game, created_at desc) where not is_flagged;

create table public.game_bests (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game public.game_kind not null,
  best_score numeric(10, 2) not null,
  best_rating smallint not null,
  achieved_at timestamptz not null,
  plays integer not null default 0,
  personal_bests integer not null default 0,
  primary key (user_id, game)
);
create index game_bests_game_score on public.game_bests (game, best_score);

-- Days on which a member practised (UTC), the basis of streaks and the Practice component.
create table public.member_days (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  games integer not null default 0,
  daily_done boolean not null default false,
  primary key (user_id, day)
);

create or replace function public.after_game_result()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  lower_better boolean := public.game_lower_is_better(new.game);
  d date := (new.created_at at time zone 'utc')::date;
begin
  if new.is_flagged then
    return new;
  end if;

  insert into public.game_bests as b (user_id, game, best_score, best_rating, achieved_at, plays, personal_bests)
  values (new.user_id, new.game, new.score, new.rating, new.created_at, 1, 1)
  on conflict (user_id, game) do update set
    plays = b.plays + 1,
    best_score = case
      when (lower_better and excluded.best_score < b.best_score) or (not lower_better and excluded.best_score > b.best_score)
      then excluded.best_score else b.best_score end,
    best_rating = greatest(b.best_rating, excluded.best_rating),
    achieved_at = case
      when (lower_better and excluded.best_score < b.best_score) or (not lower_better and excluded.best_score > b.best_score)
      then excluded.achieved_at else b.achieved_at end,
    personal_bests = b.personal_bests + case
      when (lower_better and excluded.best_score < b.best_score) or (not lower_better and excluded.best_score > b.best_score)
      then 1 else 0 end;

  insert into public.member_days as m (user_id, day, games, daily_done)
  values (new.user_id, d, 1, new.is_daily)
  on conflict (user_id, day) do update set games = m.games + 1, daily_done = m.daily_done or excluded.daily_done;

  return new;
end;
$$;
create trigger game_results_after after insert on public.game_results
  for each row execute function public.after_game_result();

-- ---------------------------------------------------------------------------------------------
-- Streaks
-- ---------------------------------------------------------------------------------------------
create or replace function public.current_streak(uid uuid)
returns integer language plpgsql stable security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'utc')::date;
  d date;
  n integer := 0;
begin
  -- A streak is alive if the member practised today or yesterday.
  if exists (select 1 from public.member_days where user_id = uid and day = today) then
    d := today;
  elsif exists (select 1 from public.member_days where user_id = uid and day = today - 1) then
    d := today - 1;
  else
    return 0;
  end if;
  while exists (select 1 from public.member_days where user_id = uid and day = d) loop
    n := n + 1;
    d := d - 1;
  end loop;
  return n;
end;
$$;

create or replace function public.longest_streak(uid uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(max(len), 0)::integer from (
    select count(*) as len from (
      select day, day - (row_number() over (order by day))::integer as grp
      from public.member_days where user_id = uid
    ) s group by grp
  ) t;
$$;

-- ---------------------------------------------------------------------------------------------
-- Percentiles and distributions (aggregate only, so they are safe to expose to everyone)
-- ---------------------------------------------------------------------------------------------
create or replace function public.game_percentile(g public.game_kind, s numeric)
returns numeric language sql stable security definer set search_path = '' as $$
  select case when count(*) = 0 then null else round(100.0 * (
      count(*) filter (where case when public.game_lower_is_better(g) then best_score > s else best_score < s end)
      + 0.5 * count(*) filter (where best_score = s)
    ) / count(*), 1) end
  from public.game_bests where game = g;
$$;

create or replace function public.game_population(g public.game_kind)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.game_bests where game = g;
$$;

-- Histogram of members' best scores, in `buckets` equal-width bins between the given bounds.
create or replace function public.game_distribution(g public.game_kind, lo numeric, hi numeric, buckets integer default 24)
returns table (bucket integer, members bigint)
language sql stable security definer set search_path = '' as $$
  select width_bucket(least(greatest(best_score, lo), hi - 0.0001), lo, hi, buckets) as bucket, count(*)
  from public.game_bests where game = g
  group by 1 order by 1;
$$;

-- ---------------------------------------------------------------------------------------------
-- Leaderboards. Members who keep their game stats private, and banned members, are left out.
-- ---------------------------------------------------------------------------------------------
create or replace function public.leaderboard(
  g public.game_kind,
  period text default 'all',
  tier_filter smallint default null,
  lim integer default 50
)
returns table (
  rank bigint, user_id uuid, username text, display_name text, avatar_url text, tier smallint,
  score numeric, achieved_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  lower_better boolean := public.game_lower_is_better(g);
  since timestamptz := case period
    when 'week' then date_trunc('week', now() at time zone 'utc') at time zone 'utc'
    when 'day' then date_trunc('day', now() at time zone 'utc') at time zone 'utc'
    else null end;
begin
  return query
  with eligible as (
    select p.id, p.username::text as username, p.display_name, p.avatar_url, p.tier
    from public.profiles p
    join public.user_settings s on s.user_id = p.id
    where s.game_stats_visibility = 'everyone'
      and not public.has_active_sanction(p.id, 'ban')
      and (tier_filter is null or p.tier = tier_filter)
  ),
  scores as (
    select b.user_id, b.best_score as score, b.achieved_at
    from public.game_bests b
    where since is null and b.game = g
    union all
    select w.user_id, w.score, w.created_at from (
      select distinct on (r.user_id) r.user_id, r.score, r.created_at
      from public.game_results r
      where since is not null and r.game = g and not r.is_flagged and r.created_at >= since
      order by r.user_id, case when lower_better then r.score else -r.score end, r.created_at
    ) w
  )
  select
    rank() over (order by case when lower_better then sc.score else -sc.score end, sc.achieved_at) as rank,
    e.id, e.username, e.display_name, e.avatar_url, e.tier, sc.score, sc.achieved_at
  from scores sc join eligible e on e.id = sc.user_id
  order by 1
  limit least(greatest(lim, 1), 100);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------------------------
alter table public.game_sessions enable row level security;
alter table public.game_results enable row level security;
alter table public.game_bests enable row level security;
alter table public.member_days enable row level security;

-- Sessions: server only.
revoke all on public.game_sessions from anon, authenticated;

create policy "Results visible per the owner's privacy setting" on public.game_results for select
  using (public.can_see(user_id, 'game_stats'));
revoke insert, update, delete on public.game_results from anon, authenticated;

create policy "Bests visible per the owner's privacy setting" on public.game_bests for select
  using (public.can_see(user_id, 'game_stats'));
revoke insert, update, delete on public.game_bests from anon, authenticated;

create policy "Practice days visible per the owner's activity setting" on public.member_days for select
  using (public.can_see(user_id, 'activity') or public.can_see(user_id, 'game_stats'));
revoke insert, update, delete on public.member_days from anon, authenticated;
