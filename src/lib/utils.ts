import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Format an ISO date string for display, localised to `en` or `id`.
 *
 * English output uses `toLocaleDateString("en-US", …)` → `"March 20, 2025"`.
 * Indonesian output uses an explicit month table → `"20 Maret 2025"`.
 *
 * @param dateString — ISO-8601 date string. An empty string returns `"TBA"`.
 * @param language — `"en"` or `"id"` (any other value falls through to English).
 * @returns A localised, human-readable date, or `"TBA"` for empty input.
 */
export function formatDateWithLocale(
  dateString: string,
  language: string
): string {
  if (dateString == "") return "TBA";
  const date = new Date(dateString);

  if (language === "id") {
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  // English format (default)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Like {@link formatDateWithLocale} but appends the time of day.
 *
 * English uses 12-hour AM/PM; Indonesian uses 24-hour HH:mm.
 *
 * @param dateString — ISO-8601 date-time. Empty string returns `"TBA"`.
 * @param language — `"en"` or `"id"`.
 * @param includeTime — pass `false` to suppress the time portion.
 */
export function formatDateTimeWithLocale(
  dateString: string,
  language: string,
  includeTime: boolean = true
): string {
  if (dateString == "") return "TBA";
  const date = new Date(dateString);

  if (language === "id") {
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const dateStr = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    
    if (includeTime) {
      const timeStr = date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
      return `${dateStr}, ${timeStr}`;
    }
    
    return dateStr;
  }

  // English format (default)
  const dateStr = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  if (includeTime) {
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
    return `${dateStr}, ${timeStr}`;
  }
  
  return dateStr;
}

/**
 * Format an array of event dates as a bulleted list, sorted chronologically.
 *
 * Each entry is rendered as `"• <date>, <time>"` and joined with `"\n"`.
 * Handles both the legacy `{ start, end }` shape and the current bare-string
 * shape.
 *
 * @param eventDates — array of ISO strings or `{start, end}` objects, or `null`.
 * @param language — `"en"` or `"id"`.
 * @returns One bulleted line per date, or `"TBD"` for empty/null input.
 */
export function formatMultipleDatesWithLocale(
  eventDates: Array<{ start: string; end: string }> | string[] | null,
  language: string
): string {
  if (!eventDates || eventDates.length === 0) {
    return language === "id" ? "TBD" : "TBD";
  }

  // Handle legacy format (string array) and new format (object array)
  const dates = eventDates.map(date => {
    if (typeof date === 'string') {
      return date;
    } else {
      return date.start;
    }
  });

  const sortedDates = [...dates].sort();
  
  const formattedDates = sortedDates.map(dateStr => {
    const date = new Date(dateStr);
    
    if (language === "id") {
      // Indonesian format: DD Month YYYY, HH:mm
      const day = date.getDate().toString().padStart(2, "0");
      const month = date.toLocaleDateString("id-ID", { month: "long" });
      const year = date.getFullYear();
      const time = date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
      return `${day} ${month} ${year}, ${time}`;
    } else {
      // English format: Month DD, YYYY, h:mm AM/PM
      const formattedDate = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      const time = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
      return `${formattedDate}, ${time}`;
    }
  });

  // Create bullet list format
  return formattedDates.map(date => `• ${date}`).join('\n');
}

/**
 * Format a single ISO date using `Intl.DateTimeFormat("en-US", …)`. Thin
 * convenience around the Intl API; prefer {@link formatDateWithLocale}
 * unless you specifically need Intl locale fallback behaviour.
 *
 * @param dateString — ISO-8601 date. Empty input returns `""`.
 */
export function formatDateWithIntl(dateString: string): string {
  if (!dateString) return "";

  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Format a list of ISO dates as an English-prose sentence:
 *   - 1 date  → `"March 20, 2025"`
 *   - 2 dates → `"March 20, 2025 and March 21, 2025"`
 *   - 3+      → `"A, B, and C"` (Oxford comma)
 *
 * For a bullet list, use {@link formatMultipleDatesWithLocale} instead.
 */
export function formatMultipleDatesWithIntl(
  eventDates: string[] | null
): string {
  if (!eventDates || eventDates.length === 0) return "";
  
  // Sort dates chronologically
  const sortedDates = [...eventDates].sort();
  
  if (sortedDates.length === 1) {
    const startDate = new Date(sortedDates[0]);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(startDate);
  }
  
  const formattedDates = sortedDates.map(dateStr => {
    const startDate = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(startDate);
  });
  
  if (formattedDates.length === 2) {
    return `${formattedDates[0]} and ${formattedDates[1]}`;
  }
  
  const lastDate = formattedDates.pop();
  return `${formattedDates.join(', ')}, and ${lastDate}`;
}

/**
 * Translate a performance-duration string (stored in English in the DB)
 * into Indonesian when `language === "id"`. Expected DB shape is
 * `"{Maximum|Minimum} {number} minutes"` — anything else passes through
 * untouched.
 *
 * @example
 *   translateDuration("Maximum 10 minutes", "id") // "Maksimal 10 menit"
 */
export function translateDuration(duration: string, language: string): string {
  if (!duration) return duration;

  const [prefix, ...rest] = duration.split(" ");
  const number = rest[0];
  const unit = rest[1];

  if (language === "id") {
    const translatedPrefix =
      prefix.toLowerCase() === "maximum" ? "Maksimal" : "Minimal";
    const translatedUnit = unit.toLowerCase() === "minutes" ? "menit" : unit;
    return `${translatedPrefix} ${number} ${translatedUnit}`;
  }

  // English format (default)
  return duration;
}

/**
 * Translate an age-requirement string into Indonesian. Recognised English
 * shapes (case-insensitive):
 *
 *   - `"All ages"`              → `"Semua usia"`
 *   - `"6-8 years old"`         → `"6-8 tahun"`
 *   - `"18 years old & above"`  → `"di atas 18 tahun"`
 *   - `"10 years old & below"`  → `"di bawah 10 tahun"`
 *
 * Anything else — or `language === "en"` — returns the input unchanged.
 */
export function translateAgeRequirement(
  ageRequirement: string,
  language: string
): string {
  if (!ageRequirement) return ageRequirement;
  if (language === "en") return ageRequirement;

  // Handle "All ages" case
  if (ageRequirement.toLowerCase() === "all ages") {
    return "Semua usia";
  }

  // Handle "[digit]-[digit] years old" case
  const ageRangeMatch = ageRequirement.match(/^(\d+)-(\d+)\s+years\s+old$/i);
  if (ageRangeMatch) {
    const [, start, end] = ageRangeMatch;
    return `${start}-${end} tahun`;
  }

  // Handle "[digit] years old & above" case
  const aboveMatch = ageRequirement.match(/^(\d+)\s+years\s+old\s+&\s+above$/i);
  if (aboveMatch) {
    const [, age] = aboveMatch;
    return `di atas ${age} tahun`;
  }

  // Handle "[digit] years old & below" case
  const belowMatch = ageRequirement.match(/^(\d+)\s+years\s+old\s+&\s+below$/i);
  if (belowMatch) {
    const [, age] = belowMatch;
    return `di bawah ${age} tahun`;
  }

  // If no pattern matches, return original
  return ageRequirement;
}

/**
 * Merge class name inputs and resolve Tailwind conflicts.
 *
 * Built on `clsx` for conditional/array support and `tailwind-merge` for
 * last-write-wins behaviour when two Tailwind utilities target the same
 * property.
 *
 * @example
 *   cn("block", condition && "hidden", props.className)
 *   cn("p-4", "p-2") // → "p-2"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
