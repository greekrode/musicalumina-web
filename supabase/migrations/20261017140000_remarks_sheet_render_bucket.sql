-- Background remarks-sheet sends render each recipient's PDFs a few per
-- function call into this private bucket (runs/<run>/<registration>.pdf),
-- then email them in a separate call, so no single call exceeds the edge
-- function CPU limit. Files are removed once the email is sent.

insert into storage.buckets (id, name, public)
values ('remarks-sheets', 'remarks-sheets', false)
on conflict (id) do nothing;
