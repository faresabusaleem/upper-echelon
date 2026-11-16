-- Tighten which SECURITY DEFINER functions the API roles may call directly.
-- Policies call only can_see, is_moderator, is_admin, can_view_category, can_view_thread and
-- is_participant; everything else is either an RPC that checks permissions itself or an internal
-- helper that must not be callable with arbitrary arguments (it could reveal private facts).

-- Trigger functions: triggers fire regardless of EXECUTE privilege, so callers never need it.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.guard_profile_update() from anon, authenticated, public;
revoke execute on function public.on_block_created() from anon, authenticated, public;
revoke execute on function public.before_follow() from anon, authenticated, public;
revoke execute on function public.after_follow() from anon, authenticated, public;
revoke execute on function public.after_game_result() from anon, authenticated, public;
revoke execute on function public.after_result_recompute() from anon, authenticated, public;
revoke execute on function public.before_test_result() from anon, authenticated, public;
revoke execute on function public.before_thread_insert() from anon, authenticated, public;
revoke execute on function public.before_thread_update() from anon, authenticated, public;
revoke execute on function public.before_thread_delete() from anon, authenticated, public;
revoke execute on function public.after_thread_insert() from anon, authenticated, public;
revoke execute on function public.before_post_insert() from anon, authenticated, public;
revoke execute on function public.before_post_update() from anon, authenticated, public;
revoke execute on function public.after_post_insert() from anon, authenticated, public;
revoke execute on function public.after_post_delete() from anon, authenticated, public;
revoke execute on function public.before_vote() from anon, authenticated, public;
revoke execute on function public.after_vote() from anon, authenticated, public;
revoke execute on function public.before_poll_vote() from anon, authenticated, public;
revoke execute on function public.before_message_insert() from anon, authenticated, public;
revoke execute on function public.after_message_insert() from anon, authenticated, public;
revoke execute on function public.before_report() from anon, authenticated, public;

-- Internal helpers that take arbitrary member ids.
revoke execute on function public.is_following(uuid, uuid) from anon, authenticated, public;
revoke execute on function public.is_blocked_between(uuid, uuid) from anon, authenticated, public;
revoke execute on function public.has_active_sanction(uuid, text) from anon, authenticated, public;
revoke execute on function public.can_write(uuid) from anon, authenticated, public;
revoke execute on function public.member_tier(uuid) from anon, authenticated, public;
revoke execute on function public.can_view_thread_for(uuid, bigint) from anon, authenticated, public;
revoke execute on function public.require_moderator() from anon, authenticated, public;

-- Signed-in only.
revoke execute on function public.admin_set_role(uuid, public.member_role) from anon, public;
revoke execute on function public.mod_member_overview(uuid) from anon, public;
revoke execute on function public.mod_move_thread(bigint, smallint) from anon, public;
revoke execute on function public.mod_resolve_report(bigint, text, text) from anon, public;
revoke execute on function public.mod_review_result(bigint, boolean, text) from anon, public;
revoke execute on function public.mod_revoke_sanction(bigint) from anon, public;
revoke execute on function public.mod_sanction(uuid, text, text, integer) from anon, public;
revoke execute on function public.mod_set_removed(text, text, boolean, text) from anon, public;
revoke execute on function public.mod_set_thread_flags(bigint, boolean, boolean) from anon, public;
revoke execute on function public.complete_initiation(text, text, text[], date) from anon, public;
revoke execute on function public.start_conversation(uuid) from anon, public;
revoke execute on function public.mark_solution(bigint, bigint) from anon, public;
revoke execute on function public.unread_counts() from anon, public;

-- can_message only answers for the caller (or the server); probing other pairs reveals blocks.
create or replace function public.can_message(sender uuid, recipient uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  p public.dm_policy;
begin
  if sender is null or recipient is null or sender = recipient then return false; end if;
  if auth.role() <> 'service_role' and sender is distinct from auth.uid() then return false; end if;
  if public.is_blocked_between(sender, recipient) then return false; end if;
  if public.is_moderator(sender) then return true; end if;
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

-- is_participant always answers for the caller.
create or replace function public.is_participant(cid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations
    where id = cid and coalesce(case when auth.role() = 'service_role' then uid end, auth.uid()) in (user_a, user_b)
  );
$$;

-- Streaks reveal practice activity. As SECURITY INVOKER they read member_days through its RLS
-- policy (the member, moderators, and viewers allowed to see the activity), while server-side and
-- definer callers such as recompute_member still see everything.
create or replace function public.current_streak(uid uuid)
returns integer language plpgsql stable security invoker set search_path = '' as $$
declare
  today date := (now() at time zone 'utc')::date;
  d date;
  n integer := 0;
begin
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
returns integer language sql stable security invoker set search_path = '' as $$
  select coalesce(max(len), 0)::integer from (
    select count(*) as len from (
      select day, day - (row_number() over (order by day))::integer as grp
      from public.member_days where user_id = uid
    ) s group by grp
  ) t;
$$;
