-- Sends now run in the background, so a failed send is kept as a row with its
-- error (shown on the admin page) instead of being deleted. Only successful
-- rows (error is null) count as sent; a later retry adds a new row.

alter table public.remarks_sheet_sends add column error text;

drop index public.remarks_sheet_sends_once;
create unique index remarks_sheet_sends_once
  on public.remarks_sheet_sends (event_id, registrant_email, registrant_type)
  where not is_test and error is null;
