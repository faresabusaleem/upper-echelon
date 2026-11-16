-- Authors may delete their own thread only while no one else has replied; afterwards the
-- conversation belongs to everyone in it, and only moderators can remove it.
create or replace function public.before_thread_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' and not public.is_moderator()
     and exists (select 1 from public.posts where thread_id = old.id and author_id is distinct from old.author_id) then
    raise exception 'Threads with replies from others cannot be deleted. Edit it, or ask a moderator.' using errcode = 'UE423';
  end if;
  return old;
end;
$$;
create trigger threads_before_delete before delete on public.threads
  for each row execute function public.before_thread_delete();

-- Thread view counts are not tracked (no write on read); "active" sorting uses last_activity_at.

-- Latest-thread helper for the forum front page: last reply author name and category, in one query.
create or replace view public.thread_list
with (security_invoker = true) as
select
  t.id, t.category_id, t.author_id, t.title, t.tags, t.is_pinned, t.is_locked, t.is_official,
  t.solved_post_id, t.score, t.reply_count, t.last_activity_at, t.created_at, t.removed_at,
  t.directory_test_id,
  c.slug as category_slug, c.name as category_name, c.min_tier as category_min_tier,
  a.username as author_username, a.display_name as author_name, a.avatar_url as author_avatar, a.tier as author_tier,
  lr.username as last_reply_username, lr.display_name as last_reply_name,
  exists (select 1 from public.polls p where p.thread_id = t.id) as has_poll
from public.threads t
join public.forum_categories c on c.id = t.category_id
left join public.profiles a on a.id = t.author_id
left join public.profiles lr on lr.id = t.last_reply_by;

grant select on public.thread_list to anon, authenticated;
