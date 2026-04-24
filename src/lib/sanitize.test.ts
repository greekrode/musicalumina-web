import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "./sanitize";

/**
 * sanitizeHtml is the second trust boundary under admin-authored HTML
 * stored in Supabase. These tests pin down the invariants we actually
 * rely on:
 *
 *   - null / undefined / "" → "" (so callers can pipe optional fields in)
 *   - safe editorial HTML (headings, paragraphs, lists, <a>, <strong>, etc.)
 *     is preserved
 *   - <script> and on* event handlers are stripped
 *   - `javascript:` URLs are stripped
 */

describe("sanitizeHtml", () => {
  it("returns an empty string for null / undefined / empty input", () => {
    expect(sanitizeHtml(null)).toBe("");
    expect(sanitizeHtml(undefined)).toBe("");
    expect(sanitizeHtml("")).toBe("");
  });

  it("preserves editorial-safe tags TinyMCE emits", () => {
    const input =
      "<h2>Heading</h2><p>Body <strong>bold</strong> <em>italic</em></p>" +
      '<ul><li>one</li><li>two</li></ul><a href="https://example.com">link</a>';
    const output = sanitizeHtml(input);
    expect(output).toContain("<h2>Heading</h2>");
    expect(output).toContain("<strong>bold</strong>");
    expect(output).toContain("<em>italic</em>");
    expect(output).toContain("<ul>");
    expect(output).toContain("<li>one</li>");
    expect(output).toContain('href="https://example.com"');
  });

  it("strips <script> tags entirely", () => {
    const input = "<p>safe</p><script>alert('x')</script><p>also safe</p>";
    const output = sanitizeHtml(input);
    expect(output).not.toContain("<script");
    expect(output).not.toContain("alert(");
    expect(output).toContain("<p>safe</p>");
    expect(output).toContain("<p>also safe</p>");
  });

  it("strips inline event handlers like onerror / onclick", () => {
    const input = `<img src="x" onerror="alert('xss')" /><button onclick="alert(1)">go</button>`;
    const output = sanitizeHtml(input);
    expect(output).not.toMatch(/onerror/i);
    expect(output).not.toMatch(/onclick/i);
    expect(output).not.toMatch(/alert\(/);
  });

  it("strips javascript: URLs in hrefs", () => {
    const input = `<a href="javascript:alert('xss')">bad</a>`;
    const output = sanitizeHtml(input);
    // DOMPurify either removes the href entirely or rewrites the scheme —
    // what matters is that the attack payload is gone.
    expect(output).not.toMatch(/javascript:/i);
  });

  it("leaves plain text alone", () => {
    expect(sanitizeHtml("just some words")).toBe("just some words");
  });
});
