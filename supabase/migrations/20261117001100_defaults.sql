-- Members insert messages without naming the sender (column privileges forbid it); the trigger
-- fills it from the session. The default keeps the generated types honest.
alter table public.messages alter column sender_id set default auth.uid();
