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

export function formatDateWithIntl(dateString: string): string {
  if (!dateString) return "";

  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
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

export function translateAgeRequirement(ageRequirement: string, language: string): string {
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
