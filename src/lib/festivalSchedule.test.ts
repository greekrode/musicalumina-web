import { describe, expect, it } from "vitest";
import {
  attachScheduleEntries,
  buildScheduleTimeline,
  durationMinutes,
  formatJakartaClock,
  performanceBlocksForCategory,
  shouldShowRunningOrder,
  type FestivalScheduleEntry,
} from "./festivalSchedule";

const segments = [
  {
    id: "break",
    kind: "break" as const,
    label: "Intermission",
    session_number: null,
    subcategory_id: null,
    starts_at: "2026-10-17T03:47:00.000Z",
    ends_at: "2026-10-17T04:02:00.000Z",
    sort_order: 80,
  },
  {
    id: "intro-b",
    kind: "performance" as const,
    label: null,
    session_number: 1,
    subcategory_id: "group-b",
    starts_at: "2026-10-17T02:42:00.000Z",
    ends_at: "2026-10-17T03:02:00.000Z",
    sort_order: 30,
  },
  {
    id: "intro-a",
    kind: "performance" as const,
    label: null,
    session_number: 1,
    subcategory_id: "group-a",
    starts_at: "2026-10-17T02:40:00.000Z",
    ends_at: "2026-10-17T02:42:00.000Z",
    sort_order: 20,
  },
];

describe("festivalSchedule", () => {
  it("formats clocks in Jakarta time", () => {
    expect(formatJakartaClock("2026-10-17T02:40:00.000Z")).toBe("09:40");
  });

  it("attaches entries in playing order and sorts segments by the day", () => {
    const entries: FestivalScheduleEntry[] = [
      { id: "e2", segment_id: "intro-a", order_index: 2, display_name: "Second" },
      { id: "e1", segment_id: "intro-a", order_index: 1, display_name: "First" },
    ];

    const schedule = attachScheduleEntries(segments, entries);
    expect(schedule.map((segment) => segment.id)).toEqual([
      "intro-a",
      "intro-b",
      "break",
    ]);
    expect(schedule[0].entries.map((entry) => entry.display_name)).toEqual([
      "First",
      "Second",
    ]);
  });

  it("folds awarding and the following break into one pause", () => {
    const schedule = attachScheduleEntries(
      [
        ...segments,
        {
          id: "award",
          kind: "awarding",
          label: "Awarding",
          session_number: 1,
          subcategory_id: null,
          starts_at: "2026-10-17T03:32:00.000Z",
          ends_at: "2026-10-17T03:47:00.000Z",
          sort_order: 70,
        },
      ],
      [],
    );

    const timeline = buildScheduleTimeline(schedule);
    expect(timeline.map((item) => item.type)).toEqual(["session", "marker"]);
    const session = timeline[0];
    expect(session.type).toBe("session");
    if (session.type !== "session") return;
    expect(session.performances.map((block) => block.id)).toEqual([
      "intro-a",
      "intro-b",
    ]);
    expect(formatJakartaClock(session.startsAt)).toBe("09:40");
    expect(formatJakartaClock(session.endsAt)).toBe("10:02");
    expect(session.awarding).toBeNull();

    const pause = timeline[1];
    expect(pause.type).toBe("marker");
    if (pause.type !== "marker") return;
    expect(pause.label).toBe("Awarding & Intermission");
    expect(pause.emphasis).toBe(true);
    expect(formatJakartaClock(pause.startsAt)).toBe("10:32");
    expect(formatJakartaClock(pause.endsAt)).toBe("11:02");
    expect(durationMinutes(pause.startsAt, pause.endsAt)).toBe(30);
  });

  it("keeps only performance blocks that belong to the category", () => {
    const schedule = attachScheduleEntries(segments, []);
    const blocks = performanceBlocksForCategory(schedule, ["group-a"]);
    expect(blocks.map((block) => block.id)).toEqual(["intro-a"]);
  });

  it("shows the running order once registration is closed and a schedule exists", () => {
    expect(
      shouldShowRunningOrder({
        status: "ongoing",
        registrationClosed: true,
        segments,
      }),
    ).toBe(true);
    expect(
      shouldShowRunningOrder({
        status: "upcoming",
        registrationClosed: false,
        segments,
      }),
    ).toBe(false);
    expect(
      shouldShowRunningOrder({
        status: "ongoing",
        registrationClosed: true,
        segments: [],
      }),
    ).toBe(false);
  });
});
