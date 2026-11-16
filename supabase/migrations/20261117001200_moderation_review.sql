-- Moderators review results flagged as implausible: clear them (they then count like any other
-- result) or keep them excluded. Every decision is audited.
create or replace function public.mod_review_result(p_result bigint, p_valid boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.require_moderator();
  r public.game_results;
begin
  select * into r from public.game_results where id = p_result;
  if r.id is null then raise exception 'Result not found.' using errcode = 'UE404'; end if;
  if p_valid and r.is_flagged then
    -- Re-insert as a clean result so bests, practice days and the score update through the
    -- normal triggers, then drop the flagged original.
    insert into public.game_results (user_id, game, score, rating, details, is_daily, is_flagged, flag_reason, created_at)
    values (r.user_id, r.game, r.score, r.rating, r.details || jsonb_build_object('reviewed_by', me), r.is_daily, false,
            null, r.created_at);
    delete from public.game_results where id = r.id;
  elsif not p_valid then
    update public.game_results set is_flagged = true, flag_reason = coalesce(p_note, flag_reason, 'rejected by a moderator')
    where id = r.id;
  end if;
  perform public.log_action(case when p_valid then 'result_cleared' else 'result_rejected' end, 'game_result',
    r.id::text, r.user_id, jsonb_build_object('game', r.game, 'score', r.score, 'note', p_note));
end;
$$;

create policy "Moderators see flagged results" on public.game_results for select to authenticated
  using (public.is_moderator());
