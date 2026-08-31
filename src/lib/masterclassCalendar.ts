export const CALENDAR_HOUR_HEIGHT = 72;

const CALENDAR_BLOCK_INSET = 1;

/**
 * Maps a time range onto the calendar without changing its duration.
 * A small inset keeps adjacent ranges visually separate while preserving
 * their true boundary on the time grid.
 */
export function getCalendarBlockPosition(
  start: number,
  end: number,
  calendarStart: number
) {
  const rawHeight = Math.max(
    ((end - start) / 60) * CALENDAR_HOUR_HEIGHT,
    0
  );
  const inset = Math.min(CALENDAR_BLOCK_INSET, rawHeight / 2);

  return {
    top:
      ((start - calendarStart) / 60) * CALENDAR_HOUR_HEIGHT + inset,
    height: Math.max(rawHeight - inset * 2, 0),
  };
}
