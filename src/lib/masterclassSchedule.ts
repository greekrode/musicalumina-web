export type ScheduleSlot = { slot_start: string; slot_end: string };

export type ReschedulableSession = {
  duration: number | null;
  number_of_slots: number | null;
  session_date: string | null;
  preferred_start_at: string | null;
  preferred_end_at: string | null;
};

export function jakartaDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export function sameInstant(left: string, right: string) {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  return Number.isFinite(leftTime) && leftTime === rightTime;
}

export function scheduleDates(
  windows: { start_at: string }[] | null | undefined,
  currentDate?: string | null
) {
  const dates = [...new Set((windows || []).map((window) => jakartaDate(window.start_at)))];
  if (currentDate && !dates.includes(currentDate)) dates.push(currentDate);
  return dates.sort();
}

/** Minutes for one slot. The stored duration wins; otherwise infer it from the booked range. */
export function sessionDurationMinutes(
  session: ReschedulableSession,
  allowedDurations?: number[] | null
) {
  if (session.duration && session.duration > 0) return session.duration;
  const slots = session.number_of_slots || 1;
  if (session.preferred_start_at && session.preferred_end_at) {
    const total = Math.round(
      (new Date(session.preferred_end_at).getTime() - new Date(session.preferred_start_at).getTime()) / 60000
    );
    if (total > 0 && total % slots === 0) {
      const perSlot = total / slots;
      if (!allowedDurations?.length || allowedDurations.includes(perSlot)) return perSlot;
    }
  }
  if (allowedDurations?.length === 1) return allowedDurations[0];
  return null;
}

/**
 * Availability hides the session's own occupied range. Keep that range selectable
 * when the admin is editing the same date.
 */
export function withCurrentSlot(
  slots: ScheduleSlot[],
  session: ReschedulableSession,
  date: string
): ScheduleSlot[] {
  const start = session.preferred_start_at;
  const end = session.preferred_end_at;
  if (!start || !end) return slots;
  const onDate = session.session_date === date || jakartaDate(start) === date;
  if (!onDate) return slots;
  if (slots.some((slot) => sameInstant(slot.slot_start, start))) return slots;
  return [...slots, { slot_start: start, slot_end: end }].sort(
    (left, right) => new Date(left.slot_start).getTime() - new Date(right.slot_start).getTime()
  );
}
