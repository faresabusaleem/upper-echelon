-- Upper Echelon · progression: the Echelon score, tiers, achievements, the Initiation, activity.
--
-- Echelon score (0–1000) = Mind + Practice + Voice   (documented in docs/scoring.md)
--   Mind     (0–500): 5 × the mean of the member's best rating (0–100) in each of the 8 games; unplayed = 0
--   Practice (0–250): 2.5 × distinct days with at least one saved game, capped at 100 days
--   Voice    (0–250): reputation, capped at 250 (2 per upvote received, 15 per accepted answer)
-- Tiers: I Initiate 0 · II Associate 100 · III Fellow 250 · IV Savant 450 · V Luminary 650 · VI Laureate 850
-- A tier, once reached, is kept.

create table public.achievements (
  code text primary key,
  name text not null,
  description text not null,
  family text not null constraint achievement_family check (family in ('arena', 'practice', 'forum', 'directory', 'rank')),
  position smallint not null default 100
);

create table public.member_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  code text not null references public.achievements (code) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, code)
);
create index member_achievements_time on public.member_achievements (user_id, earned_at desc);

create table public.tier_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  tier smallint not null,
  created_at timestamptz not null default now()
);
create index tier_events_user on public.tier_events (user_id, created_at desc);

create or replace function public.tier_for_score(score integer)
returns smallint language sql immutable set search_path = '' as $$
  select case
    when score >= 850 then 6
    when score >= 650 then 5
    when score >= 450 then 4
    when score >= 250 then 3
    when score >= 100 then 2
    else 1 end::smallint;
$$;

create or replace function public.tier_name(t smallint)
returns text language sql immutable set search_path = '' as $$
  select (array['Initiate', 'Associate', 'Fellow', 'Savant', 'Luminary', 'Laureate'])[greatest(1, least(6, t))];
$$;

create or replace function public.award(uid uuid, p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  insert into public.member_achievements (user_id, code) values (uid, p_code) on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then
    perform public.notify(uid, 'achievement', null, null, null,
      jsonb_build_object('code', p_code, 'name', (select name from public.achievements where code = p_code)));
  end if;
end;
$$;

create or replace function public.recompute_member(uid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles;
  mind integer;
  practice integer;
  voice integer;
  total integer;
  new_tier smallint;
  days integer;
  games_played integer;
  pbs integer;
  dailies integer;
  streak integer;
  upvotes integer;
  t smallint;
begin
  select * into p from public.profiles where id = uid for update;
  if p.id is null then return; end if;

  select coalesce(sum(best_rating), 0), count(*), coalesce(sum(personal_bests), 0)
    into mind, games_played, pbs
  from public.game_bests where user_id = uid;
  mind := round(5.0 * mind / 8.0);

  select count(*), count(*) filter (where daily_done) into days, dailies from public.member_days where user_id = uid;
  practice := round(2.5 * least(days, 100));
  voice := least(p.reputation, 250);
  total := least(mind + practice + voice, 1000);
  new_tier := greatest(p.tier, public.tier_for_score(total));

  update public.profiles
     set mind_score = mind, practice_score = practice, voice_score = voice, echelon_score = total, tier = new_tier
   where id = uid;

  if new_tier > p.tier then
    for t in (p.tier + 1)..new_tier loop
      insert into public.tier_events (user_id, tier) values (uid, t);
    end loop;
    perform public.notify(uid, 'tier', null, null, null,
      jsonb_build_object('tier', new_tier, 'name', public.tier_name(new_tier)));
  end if;

  -- Achievements
  if games_played >= 1 then perform public.award(uid, 'first_trial'); end if;
  if games_played >= 8 then perform public.award(uid, 'full_battery'); end if;
  if pbs >= 10 then perform public.award(uid, 'ten_bests'); end if;
  if dailies >= 1 then perform public.award(uid, 'daily_first'); end if;
  if dailies >= 7 then perform public.award(uid, 'daily_seven'); end if;
  if days > 0 then
    streak := public.longest_streak(uid);
    if streak >= 3 then perform public.award(uid, 'streak_3'); end if;
    if streak >= 7 then perform public.award(uid, 'streak_7'); end if;
    if streak >= 30 then perform public.award(uid, 'streak_30'); end if;
  end if;
  if exists (
    select 1 from public.game_bests b
    where b.user_id = uid and public.game_population(b.game) >= 20 and public.game_percentile(b.game, b.best_score) >= 90
  ) then
    perform public.award(uid, 'top_decile');
  end if;
  if exists (select 1 from public.threads where author_id = uid) then perform public.award(uid, 'first_thread'); end if;
  if exists (select 1 from public.posts where author_id = uid) then perform public.award(uid, 'first_reply'); end if;
  select coalesce((select sum(score) from public.threads where author_id = uid), 0)
       + coalesce((select sum(score) from public.posts where author_id = uid), 0)
    into upvotes;
  if upvotes >= 10 then perform public.award(uid, 'helpful_10'); end if;
  if upvotes >= 50 then perform public.award(uid, 'helpful_50'); end if;
  if exists (select 1 from public.threads t join public.posts po on po.id = t.solved_post_id where po.author_id = uid) then
    perform public.award(uid, 'solver');
  end if;
  if exists (select 1 from public.test_results where user_id = uid) then perform public.award(uid, 'cartographer'); end if;
  if new_tier >= 3 then perform public.award(uid, 'fellow'); end if;
  if new_tier >= 6 then perform public.award(uid, 'laureate'); end if;
end;
$$;

-- Recompute after a saved game and after a logged test result.
create or replace function public.after_result_recompute()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.recompute_member(new.user_id);
  return new;
end;
$$;
create trigger game_results_recompute after insert on public.game_results
  for each row when (not new.is_flagged) execute function public.after_result_recompute();
create trigger test_results_recompute after insert on public.test_results
  for each row execute function public.after_result_recompute();

-- ---------------------------------------------------------------------------------------------
-- The Initiation: name, interests and date of birth are confirmed, then the member is welcomed.
-- ---------------------------------------------------------------------------------------------
create or replace function public.complete_initiation(
  p_username text, p_display_name text, p_interests text[], p_date_of_birth date
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  current_name text;
  dob date;
begin
  if me is null then raise exception 'Sign in first.' using errcode = 'UE401'; end if;
  select username::text into current_name from public.profiles where id = me;
  select date_of_birth into dob from public.profile_private where user_id = me;
  dob := coalesce(dob, p_date_of_birth);
  if dob is null then
    raise exception 'Your date of birth is required.' using errcode = 'UE400';
  end if;
  if dob > (current_date - interval '13 years') then
    raise exception 'Members must be at least 13 years old.' using errcode = 'UE413';
  end if;
  if dob < date '1900-01-01' then
    raise exception 'Please enter a real date of birth.' using errcode = 'UE400';
  end if;
  if lower(p_username) <> lower(current_name) and not public.username_available(p_username) then
    raise exception 'That name is unavailable.' using errcode = 'UE409';
  end if;
  update public.profile_private set date_of_birth = dob where user_id = me;
  update public.profiles set
    username = p_username::extensions.citext,
    display_name = left(coalesce(nullif(trim(p_display_name), ''), p_username), 40),
    interests = (select coalesce(array_agg(left(x, 40)), '{}') from (select unnest(p_interests) as x limit 12) s),
    onboarded_at = coalesce(onboarded_at, now())
  where id = me;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Activity feed (privacy-checked)
-- ---------------------------------------------------------------------------------------------
create or replace function public.member_activity(uid uuid, lim integer default 30)
returns table (kind text, ref text, title text, detail text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.can_see(uid, 'activity') then
    return;
  end if;
  return query
  select * from (
    select 'thread'::text, t.id::text, t.title, c.name, t.created_at
    from public.threads t join public.forum_categories c on c.id = t.category_id
    where t.author_id = uid and t.removed_at is null and public.can_view_category(t.category_id)
    union all
    select 'reply', po.thread_id::text || '#' || po.id::text, t.title, left(po.body, 140), po.created_at
    from public.posts po join public.threads t on t.id = po.thread_id
    where po.author_id = uid and po.removed_at is null and t.removed_at is null and public.can_view_category(t.category_id)
    union all
    select 'achievement', a.code, a.name, a.description, ma.earned_at
    from public.member_achievements ma join public.achievements a on a.code = ma.code
    where ma.user_id = uid
    union all
    select 'tier', te.tier::text, public.tier_name(te.tier), null, te.created_at
    from public.tier_events te where te.user_id = uid
    union all
    select 'best', b.game::text, b.game::text, b.best_score::text, b.achieved_at
    from public.game_bests b where b.user_id = uid and public.can_see(uid, 'game_stats')
  ) s
  order by 5 desc
  limit least(greatest(lim, 1), 100);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Account deletion: personal content is removed; threads that hold other members' replies keep
-- their title for context but lose the author and the opening post. Called by the server with the
-- service role, immediately before the auth user is deleted (which cascades everything else).
-- ---------------------------------------------------------------------------------------------
create or replace function public.prepare_account_deletion(uid uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Server only.' using errcode = 'UE403';
  end if;
  delete from public.posts where author_id = uid;
  delete from public.threads t
   where t.author_id = uid and not exists (select 1 from public.posts p where p.thread_id = t.id);
  update public.threads
     set author_id = null,
         body = '_The opening post was removed when its author deleted their account._',
         tags = '{}'
   where author_id = uid;
  delete from public.revisions where edited_by = uid;
  delete from public.reports where reporter_id = uid;
  delete from public.uploads where user_id = uid;
end;
$$;
revoke execute on function public.prepare_account_deletion(uuid) from anon, authenticated, public;

-- ---------------------------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------------------------
alter table public.achievements enable row level security;
alter table public.member_achievements enable row level security;
alter table public.tier_events enable row level security;

create policy "Achievements catalogue is public" on public.achievements for select using (true);
revoke insert, update, delete on public.achievements from anon, authenticated;

create policy "Earned achievements are public" on public.member_achievements for select using (true);
revoke insert, update, delete on public.member_achievements from anon, authenticated;

create policy "Tier history is public" on public.tier_events for select using (true);
revoke insert, update, delete on public.tier_events from anon, authenticated;

-- Internal helpers must not be callable through the API.
revoke execute on function public.recompute_member(uuid) from anon, authenticated, public;
revoke execute on function public.award(uuid, text) from anon, authenticated, public;
revoke execute on function public.notify(uuid, text, uuid, bigint, bigint, jsonb) from anon, authenticated, public;
revoke execute on function public.hit_rate_limit(text, integer, integer) from anon, authenticated, public;
revoke execute on function public.enforce_rate_limit(text, integer, integer) from anon, authenticated, public;
revoke execute on function public.log_action(text, text, text, uuid, jsonb) from anon, authenticated, public;
