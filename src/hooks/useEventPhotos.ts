import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * useEventPhotos — fetches and signs URLs for an event's photo gallery.
 *
 * Photos live under `event-photos/<eventId>/*` in Supabase Storage and are
 * served via 1-hour signed URLs. The hook auto-refreshes signed URLs every
 * 45 minutes so long-running sessions don't see broken images.
 *
 * Extracted from the duplicated implementations in PastEventDetails and
 * PastMasterclassDetails — single source of truth, same behavior.
 */
export function useEventPhotos(eventId: string) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchEventPhotos() {
      try {
        setLoading(true);

        const { data: files, error: listError } = await supabase.storage
          .from("event-photos")
          .list(eventId);

        if (listError) throw listError;

        if (!files || files.length === 0) {
          if (mounted) setPhotos([]);
          return;
        }

        const photoUrls = await Promise.all(
          files
            .filter((file) => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
            .map(async (file) => {
              const signed = await supabase.storage
                .from("event-photos")
                .createSignedUrl(`${eventId}/${file.name}`, 3600);

              if (signed.error) throw signed.error;
              return signed.data?.signedUrl;
            })
        );

        if (mounted) setPhotos(photoUrls.filter(Boolean) as string[]);
      } catch (err) {
        console.error("Error fetching event photos:", err);
        if (mounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Failed to fetch event photos")
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (eventId) {
      fetchEventPhotos();
    }

    return () => {
      mounted = false;
    };
  }, [eventId]);

  // Refresh signed URLs every 45 minutes so the 1-hour expiry never bites.
  useEffect(() => {
    if (photos.length === 0) return;

    const refreshInterval = setInterval(async () => {
      try {
        const { data: files, error: listError } = await supabase.storage
          .from("event-photos")
          .list(eventId);

        if (listError) throw listError;
        if (!files || files.length === 0) return;

        const newPhotoUrls = await Promise.all(
          files
            .filter((file) => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
            .map(async (file) => {
              const signed = await supabase.storage
                .from("event-photos")
                .createSignedUrl(`${eventId}/${file.name}`, 3600);

              if (signed.error) throw signed.error;
              return signed.data?.signedUrl;
            })
        );

        setPhotos(newPhotoUrls.filter(Boolean) as string[]);
      } catch (err) {
        console.error("Error refreshing signed URLs:", err);
      }
    }, 45 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [eventId, photos.length]);

  return { photos, loading, error };
}
