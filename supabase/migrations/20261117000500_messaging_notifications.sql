-- Upper Echelon · direct messages, notifications and the email outbox.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint ordered_pair check (user_a < user_b),
  constraint unique_pair unique (user_a, user_b)
);
create index conversations_a on public.conversations (user_a, last_message_at desc);
create index conversations_b on public.conversations (user_b, last_message_at desc);

-- Per-participant state: read marker and "deleted for me" marker.
create table public.conversation_state (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default to_timestamp(0),
  cleared_at timestamptz,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null constraint message_length check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  removed_at timestamptz
);
create index messages_conversation on public.messages (conversation_id, created_at desc);

create or replace function public.is_participant(cid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversations where id = cid and uid in (user_a, user_b));
$$;

-- Opens (or returns) the conversation between the current member and `other`.
create or replace function public.start_conversation(other uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  a uuid := least(me, other);
  b uuid := greatest(me, other);
  cid uuid;
begin
  if me is null then raise exception 'Sign in first.' using errcode = 'UE401'; end if;
  select id into cid from public.conversations where user_a = a and user_b = b;
  if cid is not null then
    return cid;
  end if;
  if not public.can_message(me, other) then
    raise exception 'This member is not accepting messages from you.' using errcode = 'UE403';
  end if;
  if not public.can_write(me) then
    raise exception 'Your account cannot send messages right now.' using errcode = 'UE403';
  end if;
  perform public.enforce_rate_limit('newconv:' || me, 20, 86400);
  insert into public.conversations (user_a, user_b) values (a, b) returning id into cid;
  insert into public.conversation_state (conversation_id, user_id) values (cid, a), (cid, b);
  return cid;
end;
$$;

create or replace function public.before_message_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  c public.conversations;
  other uuid;
begin
  new.sender_id := auth.uid();
  select * into c from public.conversations where id = new.conversation_id;
  if c.id is null or new.sender_id not in (c.user_a, c.user_b) then
    raise exception 'Conversation not found.' using errcode = 'UE404';
  end if;
  other := case when c.user_a = new.sender_id then c.user_b else c.user_a end;
  if not public.can_write(new.sender_id) then
    raise exception 'Your account cannot send messages right now.' using errcode = 'UE403';
  end if;
  if not public.can_message(new.sender_id, other) then
    raise exception 'This member is not accepting messages from you.' using errcode = 'UE403';
  end if;
  perform public.enforce_rate_limit('msg1m:' || new.sender_id, 12, 60);
  perform public.enforce_rate_limit('msg1d:' || new.sender_id, 500, 86400);
  return new;
end;
$$;
create trigger messages_before_insert before insert on public.messages
  for each row execute function public.before_message_insert();

create or replace function public.after_message_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  c public.conversations;
  other uuid;
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id returning * into c;
  other := case when c.user_a = new.sender_id then c.user_b else c.user_a end;
  update public.conversation_state set last_read_at = new.created_at
   where conversation_id = c.id and user_id = new.sender_id;
  -- A member who "deleted" the conversation sees it again when a newer message arrives
  -- (the inbox lists conversations whose last message is newer than the member's clear marker).
  -- Email at most once per conversation per 30 minutes, and only if the recipient wants it.
  if not exists (select 1 from public.mutes where muter_id = other and muted_id = new.sender_id)
     and coalesce((select (notify_email ->> 'message')::boolean from public.user_settings where user_id = other), false)
     and not exists (
       select 1 from public.email_outbox
       where user_id = other and kind = 'message' and payload ->> 'conversation_id' = c.id::text
         and created_at > now() - interval '30 minutes'
     ) then
    insert into public.email_outbox (user_id, kind, payload)
    values (other, 'message', jsonb_build_object('conversation_id', c.id, 'actor_id', new.sender_id));
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------------------------
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null constraint notification_kind check (
    kind in ('reply', 'mention', 'follow', 'tier', 'achievement', 'solution', 'moderation', 'system')
  ),
  actor_id uuid references public.profiles (id) on delete set null,
  thread_id bigint references public.threads (id) on delete cascade,
  post_id bigint references public.posts (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user on public.notifications (user_id, created_at desc);
create index notifications_unread on public.notifications (user_id) where read_at is null;

create table public.email_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' constraint outbox_status check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index email_outbox_pending on public.email_outbox (created_at) where status = 'pending';

create trigger messages_after_insert after insert on public.messages
  for each row execute function public.after_message_insert();

-- Creates an in-app notification (and queues an email) honouring the recipient's preferences,
-- blocks and mutes. Kinds 'tier', 'achievement', 'moderation' and 'system' have no actor.
create or replace function public.notify(
  recipient uuid, p_kind text, actor uuid, p_thread bigint, p_post bigint, p_data jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  s public.user_settings;
  nid bigint;
begin
  if recipient is null or (actor is not null and actor = recipient) then return; end if;
  if actor is not null and (
    public.is_blocked_between(recipient, actor)
    or exists (select 1 from public.mutes where muter_id = recipient and muted_id = actor)
  ) then
    return;
  end if;
  select * into s from public.user_settings where user_id = recipient;
  if p_kind = 'moderation' or coalesce((s.notify_inapp ->> p_kind)::boolean, true) then
    insert into public.notifications (user_id, kind, actor_id, thread_id, post_id, data)
    values (recipient, p_kind, actor, p_thread, p_post, coalesce(p_data, '{}'::jsonb))
    returning id into nid;
  end if;
  if coalesce((s.notify_email ->> p_kind)::boolean, false) then
    insert into public.email_outbox (user_id, kind, payload)
    values (recipient, p_kind, jsonb_build_object('notification_id', nid, 'actor_id', actor,
      'thread_id', p_thread, 'post_id', p_post) || coalesce(p_data, '{}'::jsonb));
  end if;
end;
$$;

create or replace function public.after_follow()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.notifications
    where user_id = new.followee_id and actor_id = new.follower_id and kind = 'follow'
      and created_at > now() - interval '1 day'
  ) then
    perform public.notify(new.followee_id, 'follow', new.follower_id, null, null, '{}'::jsonb);
  end if;
  return new;
end;
$$;
create trigger follows_after_insert after insert on public.follows
  for each row execute function public.after_follow();

create or replace function public.unread_counts()
returns table (notifications bigint, messages bigint)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*) from public.notifications where user_id = auth.uid() and read_at is null),
    (select count(*) from public.messages m
       join public.conversations c on c.id = m.conversation_id
       join public.conversation_state st on st.conversation_id = c.id and st.user_id = auth.uid()
      where auth.uid() in (c.user_a, c.user_b)
        and m.sender_id <> auth.uid()
        and m.created_at > st.last_read_at
        and (st.cleared_at is null or m.created_at > st.cleared_at)
        and m.removed_at is null);
$$;

-- ---------------------------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.conversation_state enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.email_outbox enable row level security;

create policy "Participants see their conversations" on public.conversations for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));
revoke insert, update, delete on public.conversations from anon, authenticated;

create policy "Own conversation state" on public.conversation_state for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Update own conversation state" on public.conversation_state for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke insert, delete on public.conversation_state from anon, authenticated;
revoke update on public.conversation_state from anon, authenticated;
grant update (last_read_at, cleared_at) on public.conversation_state to authenticated;

create policy "Participants read messages after their clear marker" on public.messages for select to authenticated using (
  public.is_participant(conversation_id)
  and removed_at is null
  and not exists (
    select 1 from public.conversation_state st
    where st.conversation_id = messages.conversation_id and st.user_id = (select auth.uid())
      and st.cleared_at is not null and messages.created_at <= st.cleared_at
  )
);
create policy "Participants send messages" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()));
create policy "Senders delete their own messages" on public.messages for delete to authenticated
  using (sender_id = (select auth.uid()));
revoke update on public.messages from anon, authenticated;
revoke insert on public.messages from anon, authenticated;
grant insert (conversation_id, body) on public.messages to authenticated;

create policy "Own notifications" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Mark own notifications read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Delete own notifications" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

revoke all on public.email_outbox from anon, authenticated;
