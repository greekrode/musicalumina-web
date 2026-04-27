ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS early_bird_end_date timestamptz;

UPDATE public.events e
SET early_bird_end_date = sub.max_early_bird_end_date
FROM (
  SELECT
    c.event_id,
    max(s.early_bird_end_date) AS max_early_bird_end_date
  FROM public.event_categories c
  JOIN public.event_subcategories s ON s.category_id = c.id
  WHERE s.early_bird_end_date IS NOT NULL
  GROUP BY c.event_id
) sub
WHERE e.id = sub.event_id
  AND e.early_bird_end_date IS NULL;

ALTER TABLE public.event_subcategories
  DROP COLUMN IF EXISTS early_bird_end_date;
