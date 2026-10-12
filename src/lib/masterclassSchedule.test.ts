import { describe, expect, it } from "vitest";
import {
  scheduleDates,
  sessionDurationMinutes,
  withCurrentSlot,
} from "./masterclassSchedule";

const session = {
  duration: 45,
  number_of_slots: 2,
  session_date: "2026-10-15",
  preferred_start_at: "2026-10-15T02:00:00.000Z",
  preferred_end_at: "2026-10-15T03:30:00.000Z",
};

describe("scheduleDates", () => {
  it("keeps the current date when it is no longer on the event", () => {
    expect(scheduleDates([{ start_at: "2026-10-16T02:00:00.000Z" }], "2026-10-15")).toEqual([
      "2026-10-15",
      "2026-10-16",
    ]);
  });
});

describe("sessionDurationMinutes", () => {
  it("uses the stored per-slot duration", () => {
    expect(sessionDurationMinutes(session, [30, 45])).toBe(45);
  });

  it("infers the per-slot duration from the booked range", () => {
    expect(sessionDurationMinutes({ ...session, duration: null }, [45])).toBe(45);
  });
});

describe("withCurrentSlot", () => {
  it("keeps the session's own time on the list for the same date", () => {
    const slots = withCurrentSlot(
      [{ slot_start: "2026-10-15T04:00:00.000Z", slot_end: "2026-10-15T05:30:00.000Z" }],
      session,
      "2026-10-15"
    );

    expect(slots.map((slot) => slot.slot_start)).toEqual([
      "2026-10-15T02:00:00.000Z",
      "2026-10-15T04:00:00.000Z",
    ]);
  });

  it("does not duplicate the current time when availability already includes it", () => {
    const slots = withCurrentSlot(
      [{ slot_start: "2026-10-15T02:00:00+00:00", slot_end: "2026-10-15T03:30:00+00:00" }],
      session,
      "2026-10-15"
    );

    expect(slots).toHaveLength(1);
  });

  it("leaves another date's availability unchanged", () => {
    const open = [{ slot_start: "2026-10-16T02:00:00.000Z", slot_end: "2026-10-16T03:30:00.000Z" }];
    expect(withCurrentSlot(open, session, "2026-10-16")).toEqual(open);
  });
});
