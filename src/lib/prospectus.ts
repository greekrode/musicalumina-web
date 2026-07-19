import { supabase } from "./supabase";
import type { Language } from "./translations";

const PROSPECTUS_BUCKET = "prospectus";

export const LSPF_SECOND_EDITION_EVENT_ID =
  "7d267705-c591-4b98-8151-d8c91ebf2e31";

const PROSPECTUS_FILES: Record<Language, string> = {
  en: "LSPF-2026-2nd-Edition_Guidelines-EN.pdf",
  id: "LSPF-2026-2nd-Edition_Guidelines-ID.pdf",
};

export function getProspectusFileName(language: Language) {
  return PROSPECTUS_FILES[language];
}

/**
 * Return the public, download-forced prospectus URL for events that publish one.
 * Files are stored at `prospectus/<eventId>/<localized filename>`.
 */
export function getEventProspectusUrl(
  eventId: string,
  language: Language
): string | null {
  if (eventId !== LSPF_SECOND_EDITION_EVENT_ID) return null;

  const fileName = getProspectusFileName(language);
  const { data } = supabase.storage
    .from(PROSPECTUS_BUCKET)
    .getPublicUrl(`${eventId}/${fileName}`, { download: fileName });

  return data.publicUrl;
}
