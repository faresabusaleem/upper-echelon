-- Shouts (the Circle) can be reported. Added on its own because a new enum value cannot be used in
-- the same transaction that creates it.
alter type public.report_target add value if not exists 'shout';
