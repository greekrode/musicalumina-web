-- Add Instagram handle to customers contact list

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS instagram text;
