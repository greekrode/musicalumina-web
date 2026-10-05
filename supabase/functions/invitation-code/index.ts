import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, withCors } from "../_shared/n8n.ts";

/**
 * invitation-code — checks and redeems invitation codes server-side.
 *
 *   { action: "verify", eventId, code }                  -> { valid }
 *   { action: "redeem", eventId, code, registrationId }  -> { redeemed }
 *
 * The invitation_codes table is admin-only, so hashes and ids never reach the
 * browser. Redeeming needs the plaintext code plus a pending registration for
 * the same event, so nobody can burn codes they do not know. Hash format is
 * unchanged from src/lib/crypto.ts: "<saltHex>:<hashHex>", PBKDF2-SHA256,
 * 100 000 iterations, 32 bytes.
 */
const db = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const MAX_PER_IP = 10; // per 15 min: plenty for a person retyping a code
const MAX_PER_EVENT = 300; // per 15 min: caps total PBKDF2 work an attacker can force

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

async function matches(code: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash || !/^[0-9a-f]+$/i.test(salt)) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: Uint8Array.from(salt.match(/../g)!, (h) => parseInt(h, 16)), iterations: 100_000, hash: "SHA-256" },
    key,
    256,
  );
  const candidate = hex(new Uint8Array(bits));
  let diff = candidate.length ^ hash.length;
  for (let i = 0; i < Math.min(candidate.length, hash.length); i++) diff |= candidate.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

async function findCode(eventId: string, code: string): Promise<string | null> {
  const { data, error } = await db
    .from("invitation_codes")
    .select("id, code_hash, max_uses, current_uses, expires_at")
    .eq("event_id", eventId)
    .eq("active", true);
  if (error) throw error;
  const now = Date.now();
  for (const row of data ?? []) {
    const usable = row.current_uses < row.max_uses && (!row.expires_at || new Date(row.expires_at).getTime() > now);
    if (usable && (await matches(code, row.code_hash))) return row.id;
  }
  return null;
}

serve(
  withCors(async (req) => {
    const { action, eventId, code, registrationId } = await req.json().catch(() => ({}));
    const uuid = /^[0-9a-f-]{36}$/i;
    if (!uuid.test(String(eventId)) || typeof code !== "string" || !code || code.length > 200) {
      return jsonResponse({ error: "Invalid request" }, 400);
    }

    // Throttle guessing (and the PBKDF2 work it costs): per client IP and per
    // event over a 15-minute window. Every attempt counts, right or wrong.
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const [byIp, byEvent] = await Promise.all([
      db.from("invitation_attempts").select("id", { count: "exact", head: true }).eq("client_ip", ip).gte("created_at", since),
      db.from("invitation_attempts").select("id", { count: "exact", head: true }).eq("event_id", eventId).gte("created_at", since),
    ]);
    if ((byIp.count ?? 0) >= MAX_PER_IP || (byEvent.count ?? 0) >= MAX_PER_EVENT) {
      return jsonResponse({ error: "Too many attempts. Please wait a few minutes and try again." }, 429);
    }
    await db.from("invitation_attempts").insert({ client_ip: ip, event_id: eventId });

    const codeId = await findCode(eventId, code);
    if (action === "verify") return jsonResponse({ valid: Boolean(codeId) });
    if (action !== "redeem") return jsonResponse({ error: "Unknown action" }, 400);
    if (!codeId) return jsonResponse({ redeemed: false });
    if (!uuid.test(String(registrationId))) return jsonResponse({ error: "Invalid request" }, 400);

    const { data: reg } = await db
      .from("registrations")
      .select("id")
      .eq("id", registrationId)
      .eq("event_id", eventId)
      .eq("status", "pending")
      .maybeSingle();
    if (!reg) return jsonResponse({ redeemed: false });

    const { data: redeemed, error } = await db.rpc("redeem_invitation_code", { p_code_id: codeId });
    if (error) throw error;
    return jsonResponse({ redeemed: Boolean(redeemed) });
  }),
);
