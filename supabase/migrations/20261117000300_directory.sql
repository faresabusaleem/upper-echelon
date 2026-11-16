-- Upper Echelon · the Directory: a curated catalogue of renowned tests (links only, no questions)
-- and members' self-reported results.

create table public.directory_tests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique constraint slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null constraint name_length check (char_length(name) between 2 and 120),
  author text not null constraint author_length check (char_length(author) between 2 and 120),
  organisation text,
  measures text not null constraint measures_length check (char_length(measures) between 3 and 600),
  format text,
  item_count integer constraint item_count_range check (item_count is null or item_count between 1 and 1000),
  difficulty text not null default 'hard'
    constraint difficulty_kind check (difficulty in ('moderate', 'hard', 'very_hard', 'extreme')),
  ceiling text,
  duration text,
  cost text,
  is_free boolean,
  supervised boolean not null default false,
  url text not null constraint url_format check (url ~ '^https?://'),
  link_status text not null default 'ok' constraint link_status_kind check (link_status in ('ok', 'unreachable')),
  notes text constraint notes_length check (char_length(notes) <= 1200),
  score_scale text not null default 'IQ (SD 15)',
  position integer not null default 100,
  is_published boolean not null default true,
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A')
    || setweight(to_tsvector('english', coalesce(author, '') || ' ' || coalesce(organisation, '')), 'B')
    || setweight(to_tsvector('english', coalesce(measures, '') || ' ' || coalesce(format, '')), 'C')
  ) stored,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index directory_tests_search on public.directory_tests using gin (search);
create trigger directory_tests_touch before update on public.directory_tests
  for each row execute function public.touch_updated_at();

create table public.test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  test_id uuid not null references public.directory_tests (id) on delete cascade,
  score numeric(7, 2) not null constraint score_range check (score >= 0 and score <= 1000),
  scale text not null constraint scale_kind check (scale in ('iq15', 'iq16', 'iq24', 'raw', 'percentile')),
  taken_on date constraint taken_on_past check (taken_on is null or taken_on <= current_date),
  proof_path text,
  note text constraint note_length check (char_length(note) <= 280),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index test_results_user on public.test_results (user_id, created_at desc);
create index test_results_test on public.test_results (test_id);

create or replace function public.before_test_result()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    if not public.can_write(new.user_id) then
      raise exception 'Your account cannot log results right now.' using errcode = 'UE403';
    end if;
    perform public.enforce_rate_limit('test_result:' || new.user_id, 20, 86400);
  end if;
  -- Proof screenshots live in the member's own folder of the private proofs bucket.
  if new.proof_path is not null and new.proof_path not like new.user_id::text || '/%' then
    raise exception 'Invalid proof path.' using errcode = 'UE400';
  end if;
  return new;
end;
$$;
create trigger test_results_guard before insert or update on public.test_results
  for each row execute function public.before_test_result();

alter table public.directory_tests enable row level security;
alter table public.test_results enable row level security;

create policy "Published tests are public; admins see all" on public.directory_tests for select
  using (is_published or public.is_admin());
create policy "Admins insert tests" on public.directory_tests for insert to authenticated
  with check (public.is_admin());
create policy "Admins update tests" on public.directory_tests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete tests" on public.directory_tests for delete to authenticated
  using (public.is_admin());

create policy "Results visible per owner privacy and hidden flag" on public.test_results for select using (
  user_id = (select auth.uid()) or public.is_moderator()
  or (not is_hidden and public.can_see(user_id, 'test_results'))
);
create policy "Members log their own results" on public.test_results for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Members edit their own results" on public.test_results for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members delete their own results" on public.test_results for delete to authenticated
  using (user_id = (select auth.uid()));
