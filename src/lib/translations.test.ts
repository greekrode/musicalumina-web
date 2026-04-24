import { describe, expect, it } from "vitest";
import { translations } from "./translations";

/**
 * Translation structure invariants.
 *
 * The point of these tests isn't to pin down specific copy — designers tune
 * voice regularly. It's to guarantee the two languages stay in lock-step,
 * because a missing Indonesian key silently renders the English fallback in
 * production and nobody notices until a native speaker spots it.
 *
 * What we enforce:
 *   1. `en` and `id` exist and are objects.
 *   2. Every leaf key that exists in `en` also exists in `id` (and vice versa).
 *   3. No leaf value is an empty string — empty strings are a common editor
 *      mistake and silently ship a blank slot.
 *   4. Types match at every leaf (a string in one language is a string in
 *      the other; we don't accidentally nest an object on one side).
 */

type JsonLike =
  | string
  | number
  | boolean
  | null
  | JsonLike[]
  | { [key: string]: JsonLike };

/**
 * Walks a translation object and yields `[dottedPath, leafValue]` for every
 * leaf. Arrays are treated as leaves (we don't descend into items) so an
 * `en.foo = ["a", "b"]` pairs with `id.foo = ["x", "y"]` and not with
 * three separate keys.
 */
function* leaves(
  value: JsonLike,
  path: string[] = []
): Generator<[string, JsonLike]> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    yield [path.join("."), value];
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    yield* leaves(child as JsonLike, [...path, key]);
  }
}

describe("translations", () => {
  it("exports both en and id as objects", () => {
    expect(typeof translations.en).toBe("object");
    expect(typeof translations.id).toBe("object");
    expect(translations.en).not.toBeNull();
    expect(translations.id).not.toBeNull();
  });

  it("has 1:1 key parity between en and id", () => {
    const enKeys = new Set(
      Array.from(leaves(translations.en as unknown as JsonLike)).map(
        ([k]) => k
      )
    );
    const idKeys = new Set(
      Array.from(leaves(translations.id as unknown as JsonLike)).map(
        ([k]) => k
      )
    );

    const missingInId = [...enKeys].filter((k) => !idKeys.has(k));
    const missingInEn = [...idKeys].filter((k) => !enKeys.has(k));

    expect(missingInId, "keys present in en but not in id").toEqual([]);
    expect(missingInEn, "keys present in id but not in en").toEqual([]);
  });

  it("has no empty-string leaves (those silently render blank in production)", () => {
    const emptyEn = Array.from(
      leaves(translations.en as unknown as JsonLike)
    )
      .filter(([, v]) => v === "")
      .map(([k]) => k);
    const emptyId = Array.from(
      leaves(translations.id as unknown as JsonLike)
    )
      .filter(([, v]) => v === "")
      .map(([k]) => k);

    expect(emptyEn, "empty en values").toEqual([]);
    expect(emptyId, "empty id values").toEqual([]);
  });

  it("keeps leaf types consistent across languages", () => {
    const enLeaves = new Map(
      Array.from(leaves(translations.en as unknown as JsonLike)).map(
        ([k, v]) => [k, typeof v]
      )
    );
    const idLeaves = new Map(
      Array.from(leaves(translations.id as unknown as JsonLike)).map(
        ([k, v]) => [k, typeof v]
      )
    );

    const mismatches: Array<{ key: string; en: string; id: string }> = [];
    for (const [key, enType] of enLeaves) {
      const idType = idLeaves.get(key);
      if (idType && idType !== enType) {
        mismatches.push({ key, en: enType, id: idType });
      }
    }
    expect(mismatches, "type mismatch across languages").toEqual([]);
  });
});
