-- Public winners list needs each winner's average score (for ordering) and the
-- song they played. Scores and registrations are not anon-readable, so expose
-- only these two derived fields, for winners only, through a definer function.

create or replace function public.get_event_winner_details(p_event_id uuid)
returns table (winner_id uuid, score numeric, song_title text)
language sql
stable
security definer
set search_path = public
as $$
  select w.id,
         (select avg(es.final_score)
            from public.event_scoring es
           where es.registration_id = r.id
             and es.finalized
             and es.final_score is not null),
         r.song_title
    from public.event_winners w
    left join lateral (
      select r.id, r.song_title
        from public.registrations r
       where r.event_id = w.event_id
         and r.subcategory_id = w.subcategory_id
         and r.participant_name = w.participant_name
       order by r.created_at
       limit 1
    ) r on true
   where w.event_id = p_event_id;
$$;

revoke all on function public.get_event_winner_details(uuid) from public;
grant execute on function public.get_event_winner_details(uuid) to anon, authenticated;
