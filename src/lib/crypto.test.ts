import { describe, expect, it } from "vitest";
import { InvitationCodeCrypto } from "./crypto";

/**
 * InvitationCodeCrypto tests.
 *
 * We care about three invariants:
 *
 *   1. `hashCode(code)` returns a `"salt:hash"` shape where both sides are
 *      hex-encoded and a fresh salt is generated on every call that doesn't
 *      pass one in.
 *   2. Given the same code + same salt, we get the same hash (determinism).
 *      This is what makes verifyCode work.
 *   3. `verifyCode` returns true for the right code + false for a wrong one.
 *      It must also survive malformed hashes without throwing.
 *
 * happy-dom ships WebCrypto subtle so these tests run in the browser-ish
 * environment the app actually targets.
 */

const SALT_HEX = /^[0-9a-f]{32}$/; // 16 bytes → 32 hex chars
const HASH_HEX = /^[0-9a-f]{64}$/; // 32 bytes → 64 hex chars

describe("InvitationCodeCrypto.hashCode", () => {
  it("returns salt:hash in the documented format", async () => {
    const { hash, salt } = await InvitationCodeCrypto.hashCode(
      "music-lumina-2024"
    );
    const [saltPart, hashPart] = hash.split(":");
    expect(saltPart).toMatch(SALT_HEX);
    expect(hashPart).toMatch(HASH_HEX);
    expect(salt).toBe(saltPart);
  });

  it("generates a fresh salt on every call", async () => {
    const a = await InvitationCodeCrypto.hashCode("same-code");
    const b = await InvitationCodeCrypto.hashCode("same-code");
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it("is deterministic when the caller provides a salt", async () => {
    const first = await InvitationCodeCrypto.hashCode("abc");
    const second = await InvitationCodeCrypto.hashCode("abc", first.salt);
    expect(second.hash).toBe(first.hash);
  });

  it("produces different hashes for different codes at the same salt", async () => {
    const { salt } = await InvitationCodeCrypto.hashCode("first-code");
    const a = await InvitationCodeCrypto.hashCode("first-code", salt);
    const b = await InvitationCodeCrypto.hashCode("second-code", salt);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe("InvitationCodeCrypto.verifyCode", () => {
  it("returns true for the original code", async () => {
    const { hash } = await InvitationCodeCrypto.hashCode("festival-2025");
    expect(await InvitationCodeCrypto.verifyCode("festival-2025", hash)).toBe(
      true
    );
  });

  it("returns false for a wrong code", async () => {
    const { hash } = await InvitationCodeCrypto.hashCode("festival-2025");
    expect(await InvitationCodeCrypto.verifyCode("wrong-code", hash)).toBe(
      false
    );
  });

  it("returns false for a malformed stored hash instead of throwing", async () => {
    expect(await InvitationCodeCrypto.verifyCode("x", "")).toBe(false);
    expect(
      await InvitationCodeCrypto.verifyCode("x", "not-a-salt-hash-pair")
    ).toBe(false);
    expect(await InvitationCodeCrypto.verifyCode("x", ":")).toBe(false);
  });

  it("is case-sensitive", async () => {
    const { hash } = await InvitationCodeCrypto.hashCode("CaseSensitive");
    expect(
      await InvitationCodeCrypto.verifyCode("CaseSensitive", hash)
    ).toBe(true);
    expect(
      await InvitationCodeCrypto.verifyCode("casesensitive", hash)
    ).toBe(false);
  });
});
