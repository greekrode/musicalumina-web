-- Remarks sheets are now attached to the email instead of stored and linked,
-- and go out once per (registrant email, registrant type), like the LSPF 2026
-- mail script: a teacher who also registered their own child gets the teacher
-- email for students and the parent email for the child.

alter table public.remarks_sheet_sends add column registrant_type text not null default 'personal';
alter table public.remarks_sheet_sends alter column registrant_type drop default;

drop index public.remarks_sheet_sends_once;
create unique index remarks_sheet_sends_once
  on public.remarks_sheet_sends (event_id, registrant_email, registrant_type)
  where not is_test;

-- The remarks-sheets bucket from 20261014160000 is no longer used; it was
-- removed through the Storage API (SQL may not delete from storage tables).
