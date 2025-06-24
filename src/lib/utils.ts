import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function formatDateWithIntl(dateString: string): string {
  if (!dateString) return "";

  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

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

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
