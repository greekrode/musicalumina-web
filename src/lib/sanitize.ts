import DOMPurify from "dompurify";

/**
 * sanitizeHtml — safe wrapper around `dangerouslySetInnerHTML`.
 *
 * Every rich-text field in the app originates from TinyMCE authored by an
 * admin (Clerk-guarded, `org:admin` role). That's the first trust boundary.
 * This is the second: even if an admin account is compromised, the HTML
 * written into Supabase still runs through DOMPurify before it reaches the
 * DOM of a public visitor.
 *
 * Defaults: the DOMPurify default profile, which keeps every tag TinyMCE
 * emits (headings, paragraphs, lists, links, images, formatting) while
 * stripping `<script>`, event-handler attributes, `javascript:` URLs, and
 * anything else that could execute. That's exactly the behaviour we want —
 * no configuration changes.
 *
 * Usage:
 *   <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.description) }} />
 *
 * Handles `null`/`undefined` so callers can pass optional fields directly.
 */
export function sanitizeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return DOMPurify.sanitize(value);
}
