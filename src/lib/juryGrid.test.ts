import { describe, expect, it } from "vitest";
import { getJuryGridClassName } from "./juryGrid";

describe("getJuryGridClassName", () => {
  it.each([
    [0, "grid grid-cols-1 gap-8"],
    [1, "grid grid-cols-1 gap-8"],
    [2, "grid grid-cols-1 md:grid-cols-2 gap-8"],
    [3, "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"],
    [4, "grid grid-cols-1 md:grid-cols-2 gap-8"],
    [5, "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"],
    [6, "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"],
  ])("returns the expected grid classes for %i jurors", (jurorCount, className) => {
    expect(getJuryGridClassName(jurorCount)).toBe(className);
  });
});
