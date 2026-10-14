-- Admins can resend a recipient's email with a chosen subset of participants.
-- Resends are logged like any send but do not count against the
-- once-per-recipient rule of "send to all ready".

alter table public.remarks_sheet_sends add column is_resend boolean not null default false;

drop index public.remarks_sheet_sends_once;
create unique index remarks_sheet_sends_once
  on public.remarks_sheet_sends (event_id, registrant_email, registrant_type)
  where not is_test and not is_resend and error is null;
