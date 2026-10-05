/**
 * Shared abuse guards for the public edge functions.
 *
 * - verifyTurnstile: canonical siteverify. Fails closed: missing secret,
 *   network error, wrong action or wrong hostname all reject.
 * - escapeHtml: every value interpolated into an email body goes through it,
 *   so a registrant name like `<a href=evil>` cannot inject markup.
 * - clientIp: first X-Forwarded-For hop, for rate limiting.
 */

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
}

export async function verifyTurnstile(req: Request, token: unknown, expectedAction: string): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET");
  const hostnames = new Set(
    (Deno.env.get("TURNSTILE_HOSTNAMES") ?? "").split(",").map((h) => h.trim()).filter(Boolean),
  );
  if (!secret || hostnames.size === 0) {
    console.error("Turnstile not configured (TURNSTILE_SECRET / TURNSTILE_HOSTNAMES)");
    return false;
  }
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({ secret, response: token, remoteip: clientIp(req) }),
    });
    if (!res.ok) return false;
    const result = await res.json();
    return result.success === true && result.action === expectedAction && hostnames.has(result.hostname);
  } catch {
    return false;
  }
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
