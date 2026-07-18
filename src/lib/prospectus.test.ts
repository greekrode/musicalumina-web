import { describe, expect, it } from "vitest";
import {
  getEventProspectusUrl,
  getProspectusFileName,
  LSPF_SECOND_EDITION_EVENT_ID,
} from "./prospectus";

describe("event prospectus", () => {
  it("selects the PDF matching the active language", () => {
    expect(getProspectusFileName("en")).toBe(
      "LSPF-2026-2nd-Edition_Guidelines-EN.pdf"
    );
    expect(getProspectusFileName("id")).toBe(
      "LSPF-2026-2nd-Edition_Guidelines-ID.pdf"
    );
  });

  it("only exposes a prospectus for the configured event", () => {
    expect(getEventProspectusUrl("another-event", "en")).toBeNull();

    const url = getEventProspectusUrl(LSPF_SECOND_EDITION_EVENT_ID, "id");
    expect(url).toContain(
      `/repertoires/${LSPF_SECOND_EDITION_EVENT_ID}/LSPF-2026-2nd-Edition_Guidelines-ID.pdf`
    );
    expect(url).toContain("download=");
  });
});
