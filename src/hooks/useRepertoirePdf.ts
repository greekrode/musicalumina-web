import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useRepertoirePdf(categoryId: string) {
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

        // Get signed URL for the PDF file
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from("categories-repertoires")
          .createSignedUrl(`${categoryId}/${pdfFile.name}`, 3600); // 1 hour expiry

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
  }, [categoryId]);

  return { pdfUrl, loading, error };
} 