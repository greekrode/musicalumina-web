import { useState, useEffect } from "react";
import { getLatestUpcomingEvent } from "../lib/supabase";

type Event = {
  id: string;
  title: string;
  start_date: string;
  type: string;
};

/**
 * Fetch the "now booking" hero pill for the homepage — the most recent
 * upcoming event. Fires once on mount; no params, no refetch.
 *
 * @returns `{ events, loading, error }`. `events` is a lightweight shape
 *          ({@link Event}) with just enough fields for the hero card.
 */
export const useLatestEvent = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchLatestEvents = async () => {
      try {
        const data = await getLatestUpcomingEvent();
        setEvents(data || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to fetch latest events")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLatestEvents();
  }, []);

  return { events, loading, error };
};
