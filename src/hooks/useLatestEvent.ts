import { useState, useEffect } from "react";
import { getLatestUpcomingEvent } from "../lib/supabase";

type LatestEvent = {
  id: string;
  title: string;
  start_date: string;
} | null;

export const useLatestEvent = () => {
  const [event, setEvent] = useState<LatestEvent>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchLatestEvent = async () => {
      try {
        const data = await getLatestUpcomingEvent();
        setEvent(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch latest event"));
      } finally {
        setLoading(false);
      }
    };

    fetchLatestEvent();
  }, []);

  return { event, loading, error };
}; 