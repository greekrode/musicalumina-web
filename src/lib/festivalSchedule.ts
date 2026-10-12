export type FestivalScheduleKind = "opening" | "performance" | "awarding" | "break";

export type FestivalScheduleEntry = {
  id: string;
  segment_id: string;
  order_index: number;
  display_name: string;
};

export type FestivalScheduleSegment = {
  id: string;
  kind: FestivalScheduleKind;
  label: string | null;
  session_number: number | null;
  subcategory_id: string | null;
  starts_at: string;
  ends_at: string;
  sort_order: number;
  entries: FestivalScheduleEntry[];
};

const JAKARTA_CLOCK = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta",
});

export function formatJakartaClock(iso: string): string {
  return JAKARTA_CLOCK.format(new Date(iso));
}

export function attachScheduleEntries(
  segments: Omit<FestivalScheduleSegment, "entries">[],
  entries: FestivalScheduleEntry[],
): FestivalScheduleSegment[] {
  const bySegment = new Map<string, FestivalScheduleEntry[]>();
  for (const entry of entries) {
    const list = bySegment.get(entry.segment_id) ?? [];
    list.push(entry);
    bySegment.set(entry.segment_id, list);
  }

  return [...segments]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((segment) => ({
      ...segment,
      entries: (bySegment.get(segment.id) ?? []).sort(
        (a, b) => a.order_index - b.order_index,
      ),
    }));
}

export type ScheduleMarker = {
  type: "marker";
  id: string;
  label: string | null;
  startsAt: string;
  endsAt: string;
  /** Awarding folded together with the break that follows it. */
  emphasis?: boolean;
};

export type ScheduleSession = {
  type: "session";
  sessionNumber: number;
  startsAt: string;
  endsAt: string;
  performances: FestivalScheduleSegment[];
  awarding: { startsAt: string; endsAt: string } | null;
};

export type ScheduleTimelineItem = ScheduleMarker | ScheduleSession;

export function durationMinutes(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
}

function isAfter(laterIso: string, earlierIso: string): boolean {
  return new Date(laterIso).getTime() > new Date(earlierIso).getTime();
}

/**
 * Walk the day in order. A session ends when the playing stops.
 * Awarding plus the break right after it become one pause, start to finish.
 */
export function buildScheduleTimeline(
  segments: FestivalScheduleSegment[],
): ScheduleTimelineItem[] {
  const items: ScheduleTimelineItem[] = [];
  let current: ScheduleSession | null = null;

  const flush = () => {
    if (!current) return;
    items.push(current);
    current = null;
  };

  for (const segment of [...segments].sort((a, b) => a.sort_order - b.sort_order)) {
    if (segment.kind === "opening" || segment.kind === "break") {
      flush();
      items.push({
        type: "marker",
        id: segment.id,
        label: segment.label,
        startsAt: segment.starts_at,
        endsAt: segment.ends_at,
      });
      continue;
    }

    if (segment.session_number == null) continue;

    if (!current || current.sessionNumber !== segment.session_number) {
      flush();
      current = {
        type: "session",
        sessionNumber: segment.session_number,
        startsAt: segment.starts_at,
        endsAt: segment.ends_at,
        performances: [],
        awarding: null,
      };
    }

    if (segment.kind === "performance") {
      current.performances.push(segment);
      if (isAfter(segment.ends_at, current.endsAt)) current.endsAt = segment.ends_at;
    } else if (segment.kind === "awarding") {
      current.awarding = {
        startsAt: segment.starts_at,
        endsAt: segment.ends_at,
      };
    }
  }

  flush();
  return mergeAwardingWithFollowingBreak(items);
}

function mergeAwardingWithFollowingBreak(
  items: ScheduleTimelineItem[],
): ScheduleTimelineItem[] {
  const merged: ScheduleTimelineItem[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const next = items[index + 1];
    if (item.type !== "session" || !item.awarding) {
      merged.push(item);
      continue;
    }

    const follows =
      next?.type === "marker" && next.label !== "Opening" ? next : null;
    merged.push({ ...item, awarding: null });
    merged.push({
      type: "marker",
      id: `pause-${item.sessionNumber}`,
      label: follows ? `Awarding & ${follows.label}` : "Awarding",
      startsAt: item.awarding.startsAt,
      endsAt: follows ? follows.endsAt : item.awarding.endsAt,
      emphasis: true,
    });
    if (follows) index += 1;
  }

  return merged;
}

export function performanceBlocksForCategory(
  segments: FestivalScheduleSegment[],
  subcategoryIds: string[],
): FestivalScheduleSegment[] {
  const ids = new Set(subcategoryIds);
  return segments.filter(
    (segment) =>
      segment.kind === "performance" &&
      segment.subcategory_id !== null &&
      ids.has(segment.subcategory_id),
  );
}

export function shouldShowRunningOrder(input: {
  status: string;
  registrationClosed: boolean;
  segments: { kind: string }[];
}): boolean {
  const hasPerformance = input.segments.some((segment) => segment.kind === "performance");
  if (!hasPerformance) return false;
  return (
    input.registrationClosed ||
    input.status === "ongoing" ||
    input.status === "completed"
  );
}
