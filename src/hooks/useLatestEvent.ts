import { useState, useEffect } from "react";
import { getLatestUpcomingEvent } from "../lib/supabase";

type Event = {
  id: string;
  title: string;
  start_date: string;
  type: string;
};

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
