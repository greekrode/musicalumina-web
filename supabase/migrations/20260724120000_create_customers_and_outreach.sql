-- Customers contact list + per-event Poster/Broadcast outreach tracking

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  whatsapp text NOT NULL,
  email text,
  address text,
  type text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.customer_event_outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  poster boolean NOT NULL DEFAULT false,
  broadcast boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (customer_id, event_id)
);

CREATE INDEX IF NOT EXISTS customers_whatsapp_idx ON public.customers (whatsapp);
CREATE INDEX IF NOT EXISTS customers_name_idx ON public.customers (name);
CREATE INDEX IF NOT EXISTS customers_type_idx ON public.customers (type);
CREATE INDEX IF NOT EXISTS customer_event_outreach_event_id_idx
  ON public.customer_event_outreach (event_id);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_event_outreach ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access on customers" ON public.customers;
CREATE POLICY "Allow all access on customers"
  ON public.customers
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access on customer_event_outreach"
  ON public.customer_event_outreach;
CREATE POLICY "Allow all access on customer_event_outreach"
  ON public.customer_event_outreach
  FOR ALL
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.customers TO anon, authenticated;
GRANT ALL ON public.customer_event_outreach TO anon, authenticated;
