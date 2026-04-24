import { useState, useEffect } from 'react';
import { getEvents } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Event = Database['public']['Tables']['events']['Row'] & {
  event_categories: (Database['public']['Tables']['event_categories']['Row'] & {
    event_subcategories: Database['public']['Tables']['event_subcategories']['Row'][];
  })[];
  event_jury: Database['public']['Tables']['event_jury']['Row'][];
  event_prizes: Database['public']['Tables']['event_prizes']['Row'][];
};

interface UseEventsOptions {
  status?: 'upcoming' | 'completed';
  page?: number;
  limit?: number;
}

/**
 * Fetch a paginated list of events filtered by status, joined with
 * categories / subcategories / jury / prizes.
 *
 * @param status — `"upcoming"` or `"completed"`. Omit to include all.
 * @param page   — 1-indexed page number (default `1`).
 * @param limit  — page size (default `10`).
 * @returns `{ events, loading, error, total }`.
 */
export function useEvents({ status, page = 1, limit = 10 }: UseEventsOptions = {}) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        const { events: data, total: totalCount } = await getEvents({ 
          status, 
          page, 
          limit 
        });
        setEvents(data as Event[]);
        setTotal(totalCount);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch events'));
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [status, page, limit]);

  return { events, loading, error, total };
}