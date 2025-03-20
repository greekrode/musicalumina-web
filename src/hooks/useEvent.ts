import { useState, useEffect } from 'react';
import { getEventById } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Event = Database['public']['Tables']['events']['Row'] & {
  event_categories: (Database['public']['Tables']['event_categories']['Row'] & {
    event_subcategories: Database['public']['Tables']['event_subcategories']['Row'][];
    event_prizes: Database['public']['Tables']['event_prizes']['Row'][];
  })[];
  event_jury: Database['public']['Tables']['event_jury']['Row'][];
};

export function useEvent(id: string) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      try {
        setLoading(true);
        const data = await getEventById(id);
        setEvent(data as Event);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch event'));
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchEvent();
    }
  }, [id]);

  return { event, loading, error };
}