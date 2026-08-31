import { describe, expect, it } from "vitest";
import {
  CALENDAR_HOUR_HEIGHT,
  getCalendarBlockPosition,
} from "./masterclassCalendar";

describe("getCalendarBlockPosition", () => {
  it("keeps adjacent time ranges visually separate", () => {
    const calendarStart = 9 * 60;
    const breakBlock = getCalendarBlockPosition(
      15 * 60 + 15,
      15 * 60 + 30,
      calendarStart
    );
    const sessionBlock = getCalendarBlockPosition(
      15 * 60 + 30,
      16 * 60 + 15,
      calendarStart
    );

    expect(breakBlock.top + breakBlock.height).toBeLessThan(
      sessionBlock.top
    );
  });

  it("uses the real duration instead of forcing a minimum height", () => {
    const block = getCalendarBlockPosition(15 * 60 + 15, 15 * 60 + 30, 9 * 60);
    const realHeight = (15 / 60) * CALENDAR_HOUR_HEIGHT;

    expect(block.height).toBe(realHeight - 2);
    expect(block.height).toBeLessThan(24);
  });
});
