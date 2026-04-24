import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

/**
 * Resolve the downloadable repertoire PDF for a category.
 *
 * Lists `categories-repertoires/<categoryId>/` in Supabase Storage, picks
 * the first `.pdf`, and returns a signed URL valid until the event's start
 * date (or ~forever if `eventStartDate` is omitted). Returns
 * `{ pdfUrl: null }` silently when the folder is empty or has no PDF —
 * callers render "no PDF available" copy in that case instead of an error.
 *
 * @param categoryId     — `event_categories.id`.
 * @param eventStartDate — ISO date the URL should remain valid until.
 */
export function useRepertoirePdf(categoryId: string, eventStartDate?: string) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchRepertoirePdf() {
      try {
        setLoading(true);

        // List all files in the category's directory
        const { data: files, error: listError } = await supabase.storage
          .from("categories-repertoires")
          .list(categoryId);

        if (listError) throw listError;

        // If no files found, just return null without error
        if (!files || files.length === 0) {
          if (mounted) setPdfUrl(null);
          return;
        }

        // Find the first PDF file
        const pdfFile = files.find(file => file.name.toLowerCase().endsWith('.pdf'));
        
        // If no PDF file found, return null without error
        if (!pdfFile) {
          if (mounted) setPdfUrl(null);
          return;
        }

        // Calculate the seconds difference from today until the event start date
        // If eventStartDate is provided, use it; otherwise fall back to a default date
        const targetDate = eventStartDate ? new Date(eventStartDate) : new Date('2099-12-31');
        const currentDate = new Date();
        const timeDifference = targetDate.getTime() - currentDate.getTime();
        const secondsDifference = Math.floor(timeDifference / 1000);

        // Get signed URL for the PDF file
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from("categories-repertoires")
          .createSignedUrl(`${categoryId}/${pdfFile.name}`, secondsDifference);

        if (signedUrlError) throw signedUrlError;
        if (mounted) setPdfUrl(signedUrlData?.signedUrl || null);
      } catch (err) {
        console.error("Error fetching repertoire PDF:", err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error("Failed to fetch repertoire PDF"));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (categoryId) {
      fetchRepertoirePdf();
    }

    return () => {
      mounted = false;
    };
  }, [categoryId, eventStartDate]);

  return { pdfUrl, loading, error };
} 