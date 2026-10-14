import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, withCors } from "../_shared/n8n.ts";
import { clientIp, verifyTurnstile } from "../_shared/guard.ts";

/**
 * teacher-walkin — the walk-in teacher QR at an event venue.
 *
 *   { action: "open", eventId, latitude, longitude, accuracy, turnstileToken }
 *       -> { token, expiresAt }
 *   { action: "submit", token, name, email, whatsapp } -> { ok }
 *
 * "open" needs Turnstile, is rate-limited per IP, and only succeeds on one of
 * the event's days (Jakarta) with a browser location inside the venue gate
 * (teacher_walkin_gates). It returns a random single-use token; only its
 * SHA-256 is stored. "submit" uses up the token and adds the teacher to
 * customers unless the WhatsApp number or email is already there; the answer
 * is the same either way, so the form can't be used to look people up.
 * Failures come back as { error, code } with a stable code the page translates.
 */
const MAX_OPENS_PER_IP = 60; // per 15 minutes; a venue's Wi-Fi shares one IP
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

const REFUSALS: Record<string, [status: number, error: string]> = {
  closed: [403, "The walk-in teacher form is not open for this event."],
  not_event_day: [403, "The walk-in teacher form only opens on the event day."],
  too_far: [403, "You need to be at the venue to use this form."],
  invalid_link: [404, "This link is not valid. Please scan the QR code again."],
  link_used: [410, "This link has already been used. Please scan the QR code again."],
  link_expired: [410, "This link has expired. Please scan the QR code again."],
  invalid_input: [400, "Please check your name, email and WhatsApp number."],
};

function refusal(code: string): Response {
  const [status, error] = REFUSALS[code] ?? [500, "Something went wrong. Please try again."];
  return jsonResponse({ error, code }, status);
}

async function sha256Hex(text: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

const isNumberIn = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

async function rpc(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data as Record<string, unknown>;
}

async function open(req: Request, body: Record<string, unknown>): Promise<Response> {
  const { eventId, latitude, longitude, accuracy, turnstileToken } = body;
  if (
    typeof eventId !== "string" || !UUID.test(eventId) ||
    !isNumberIn(latitude, -90, 90) || !isNumberIn(longitude, -180, 180) ||
    !isNumberIn(accuracy, 0, 1_000_000)
  ) {
    return jsonResponse({ error: "Invalid request" }, 400);
  }

  const ip = clientIp(req);
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count } = await db
    .from("abuse_attempts").select("id", { count: "exact", head: true })
    .eq("bucket", "teacher-walkin").eq("client_ip", ip).gte("created_at", since);
  if ((count ?? 0) >= MAX_OPENS_PER_IP) {
    return jsonResponse({ error: "Too many attempts. Please wait a few minutes.", code: "rate_limited" }, 429);
  }
  await db.from("abuse_attempts").insert({ bucket: "teacher-walkin", client_ip: ip });

  if (!(await verifyTurnstile(req, turnstileToken, "teacher"))) {
    return jsonResponse({ error: "Verification failed. Please refresh and try again.", code: "verification" }, 403);
  }

  const token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); // base64url, 43 chars
  const result = await rpc("open_teacher_walkin", {
    p_event_id: eventId,
    p_latitude: latitude,
    p_longitude: longitude,
    p_accuracy_m: accuracy,
    p_token_hash: await sha256Hex(token),
    p_client_ip: ip,
  });
  if (typeof result.error === "string") return refusal(result.error);
  return jsonResponse({ token, expiresAt: result.expiresAt });
}

async function submit(body: Record<string, unknown>): Promise<Response> {
  const { token, name, email, whatsapp } = body;
  if (typeof token !== "string" || !TOKEN.test(token)) return refusal("invalid_link");
  if (
    typeof name !== "string" || name.length > 200 ||
    typeof email !== "string" || email.length > 254 ||
    typeof whatsapp !== "string" || whatsapp.length > 40
  ) {
    return refusal("invalid_input");
  }

  const result = await rpc("submit_teacher_walkin", {
    p_token_hash: await sha256Hex(token),
    p_name: name,
    p_email: email,
    p_whatsapp: whatsapp,
  });
  if (typeof result.error === "string") return refusal(result.error);
  return jsonResponse({ ok: true });
}

serve(
  withCors(async (req) => {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonResponse({ error: "Invalid request" }, 400);
    if (body.action === "open") return open(req, body);
    if (body.action === "submit") return submit(body);
    return jsonResponse({ error: "Invalid request" }, 400);
  }),
);
