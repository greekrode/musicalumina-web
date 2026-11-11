alter table public.events add column date_month_only boolean not null default false;
comment on column public.events.date_month_only is 'Exact day not announced yet: show only the month and year of start_date.';
