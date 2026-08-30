-- Administrators may deliberately place sessions on the same time range.
-- Public booking still excludes every occupied range through
-- get_masterclass_available_slots.
alter table public.masterclass_participants
  drop constraint if exists masterclass_participants_no_overlapping_times;
