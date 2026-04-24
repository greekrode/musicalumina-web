import { describe, expect, it } from "vitest";
import {
  cn,
  formatDateWithLocale,
  formatDateTimeWithLocale,
  formatMultipleDatesWithLocale,
  formatDateWithIntl,
  formatMultipleDatesWithIntl,
  translateAgeRequirement,
  translateDuration,
} from "./utils";

/**
 * Time-zone note
 * --------------
 * `formatDateWithLocale("2025-03-20", "id")` reads "20 Maret 2025" only when
 * Node's local TZ is at or west of UTC. Our ISO strings use an explicit
 * offset (e.g. `"2025-03-20T09:00:00+07:00"`), which sidesteps that. Assertions
 * below stick to those explicit-offset inputs for determinism.
 */

describe("cn", () => {
  it("merges plain strings", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("drops falsy values", () => {
    expect(cn("a", null, undefined, false, "b")).toBe("a b");
  });

  it("collapses conflicting tailwind classes via twMerge", () => {
    // p-2 must win over p-4 because it comes later.
    expect(cn("p-4", "p-2")).toBe("p-2");
    // text-red-500 wins over text-blue-500.
    expect(cn("text-blue-500", "text-red-500")).toBe("text-red-500");
  });

  it("accepts arrays and objects", () => {
    expect(cn(["a", "b"], { c: true, d: false })).toBe("a b c");
  });
});

describe("formatDateWithLocale", () => {
  it("returns TBA for an empty string", () => {
    expect(formatDateWithLocale("", "en")).toBe("TBA");
    expect(formatDateWithLocale("", "id")).toBe("TBA");
  });

  it("formats English dates using toLocaleDateString", () => {
    const out = formatDateWithLocale("2025-03-20T00:00:00+07:00", "en");
    // en-US with { year, month: long, day } → "March 19, 2025" or
    // "March 20, 2025" depending on runner TZ. Check structure rather than day.
    expect(out).toMatch(/^March \d{1,2}, 2025$/);
  });

  it("formats Indonesian dates with local month names", () => {
    const out = formatDateWithLocale("2025-03-20T00:00:00+07:00", "id");
    // Day can shift by TZ. Check for Indonesian month name + year.
    expect(out).toMatch(/\d{1,2} Maret 2025/);
  });
});

describe("formatDateTimeWithLocale", () => {
  it("returns TBA for an empty string", () => {
    expect(formatDateTimeWithLocale("", "en")).toBe("TBA");
  });

  it("omits time when includeTime is false", () => {
    const out = formatDateTimeWithLocale(
      "2025-03-20T09:00:00+07:00",
      "en",
      false
    );
    expect(out).not.toMatch(/[AP]M/);
  });

  it("includes time when includeTime is true (default)", () => {
    const out = formatDateTimeWithLocale("2025-03-20T09:00:00+07:00", "en");
    expect(out).toMatch(/[AP]M/);
  });
});

describe("formatMultipleDatesWithLocale", () => {
  it("returns TBD for null/empty input", () => {
    expect(formatMultipleDatesWithLocale(null, "en")).toBe("TBD");
    expect(formatMultipleDatesWithLocale([], "en")).toBe("TBD");
  });

  it("bullets each date with a leading •", () => {
    const out = formatMultipleDatesWithLocale(
      ["2025-03-20T09:00:00+07:00", "2025-03-21T09:00:00+07:00"],
      "en"
    );
    expect(out.startsWith("• ")).toBe(true);
    expect(out.split("\n").length).toBe(2);
    expect(out.split("\n").every((line) => line.startsWith("• "))).toBe(true);
  });

  it("accepts the legacy {start,end} object shape", () => {
    const out = formatMultipleDatesWithLocale(
      [{ start: "2025-03-20T09:00:00+07:00", end: "2025-03-20T10:00:00+07:00" }],
      "en"
    );
    expect(out.startsWith("• ")).toBe(true);
  });

  it("sorts dates chronologically", () => {
    const out = formatMultipleDatesWithLocale(
      ["2025-05-01T09:00:00+07:00", "2025-01-01T09:00:00+07:00"],
      "en"
    );
    const first = out.split("\n")[0];
    expect(first).toMatch(/January/);
  });
});

describe("formatDateWithIntl", () => {
  it("returns empty string for empty input", () => {
    expect(formatDateWithIntl("")).toBe("");
  });

  it("formats a single ISO date in en-US", () => {
    expect(formatDateWithIntl("2025-03-20T00:00:00+07:00")).toMatch(
      /^March \d{1,2}, 2025$/
    );
  });
});

describe("formatMultipleDatesWithIntl", () => {
  it("returns empty string for null/empty", () => {
    expect(formatMultipleDatesWithIntl(null)).toBe("");
    expect(formatMultipleDatesWithIntl([])).toBe("");
  });

  // Note: each formatted date already contains an internal comma
  // ("March 20, 2025"), so we assert on the *joiner* patterns rather
  // than raw comma counts.

  it("single date renders without any joiner", () => {
    const out = formatMultipleDatesWithIntl(["2025-03-20T00:00:00+07:00"]);
    expect(out).toMatch(/^March \d{1,2}, 2025$/);
    expect(out).not.toMatch(/ and /);
  });

  it("two dates render with ' and ' joiner and no list comma", () => {
    const out = formatMultipleDatesWithIntl([
      "2025-03-20T00:00:00+07:00",
      "2025-03-21T00:00:00+07:00",
    ]);
    expect(out).toMatch(/ and /);
    // Two-item form: no ", " list separator between items.
    expect(out).not.toMatch(/, and /);
  });

  it("three+ dates use an Oxford ', and ' joiner", () => {
    const out = formatMultipleDatesWithIntl([
      "2025-03-20T00:00:00+07:00",
      "2025-03-21T00:00:00+07:00",
      "2025-03-22T00:00:00+07:00",
    ]);
    expect(out).toMatch(/, and /);
  });
});

describe("translateDuration", () => {
  it("returns input unchanged for empty strings", () => {
    expect(translateDuration("", "en")).toBe("");
    expect(translateDuration("", "id")).toBe("");
  });

  it("returns English input unchanged", () => {
    expect(translateDuration("Maximum 10 minutes", "en")).toBe(
      "Maximum 10 minutes"
    );
  });

  it("translates Maximum → Maksimal and minutes → menit", () => {
    expect(translateDuration("Maximum 10 minutes", "id")).toBe(
      "Maksimal 10 menit"
    );
  });

  it("translates Minimum → Minimal", () => {
    expect(translateDuration("Minimum 5 minutes", "id")).toBe(
      "Minimal 5 menit"
    );
  });
});

describe("translateAgeRequirement", () => {
  it("returns input unchanged for empty or English", () => {
    expect(translateAgeRequirement("", "id")).toBe("");
    expect(translateAgeRequirement("6-8 years old", "en")).toBe(
      "6-8 years old"
    );
  });

  it("translates 'All ages' → 'Semua usia'", () => {
    expect(translateAgeRequirement("All ages", "id")).toBe("Semua usia");
    // case-insensitive
    expect(translateAgeRequirement("all ages", "id")).toBe("Semua usia");
  });

  it("translates an age range", () => {
    expect(translateAgeRequirement("6-8 years old", "id")).toBe("6-8 tahun");
    expect(translateAgeRequirement("12-15 years old", "id")).toBe(
      "12-15 tahun"
    );
  });

  it("translates 'X years old & above' → 'di atas X tahun'", () => {
    expect(translateAgeRequirement("18 years old & above", "id")).toBe(
      "di atas 18 tahun"
    );
  });

  it("translates 'X years old & below' → 'di bawah X tahun'", () => {
    expect(translateAgeRequirement("10 years old & below", "id")).toBe(
      "di bawah 10 tahun"
    );
  });

  it("falls through to original for unknown patterns", () => {
    expect(translateAgeRequirement("ages 6 to 8", "id")).toBe("ages 6 to 8");
  });
});
