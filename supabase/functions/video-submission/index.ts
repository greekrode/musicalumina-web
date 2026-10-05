import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { basicAuthHeader, jsonResponse, withCors } from "../_shared/n8n.ts";
import { clientIp, verifyTurnstile } from "../_shared/guard.ts";

/**
 * video-submission — the public "submit your performance video" flow.
 *
 *   { action: "lookup", refCode, turnstileToken }           -> participant summary
 *   { action: "submit", refCode, videoUrl, turnstileToken } -> { ok }
 *
 * Replaces lark-search / lark-update, which let any caller query or write
 * any Lark base, table and record. Here the base/table are fixed, the only
 * filter is the registration reference code, the Lark record id never leaves
 * the server, a video can be set once, and every call needs Turnstile and is
 * rate-limited per IP.
 */
const LARK = { base_id: "DPxNbSyPEa918OsuMJWlzy43gId", table_id: "tblh4z8siDb2qt50", view_id: "vewx2setSe" };
const MAX_PER_IP = 20; // per 15 minutes
const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

type LarkItem = {
  record_id: string;
  fields: {
    "Participant's Name"?: Array<{ text: string }>;
    Category?: string;
    "Sub Category"?: string;
    "Song Title"?: Array<{ text: string }>;
    "Video URL"?: { link: string; text: string };
  };
};

async function findRecord(refCode: string): Promise<LarkItem | null> {
  const res = await fetch("https://hooks.kangritel.com/webhook/search-lark", {
    method: "POST",
    headers: { Authorization: basicAuthHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      ...LARK,
      filter: { conjunction: "and", conditions: [{ field_name: "Registration Reference Code", operator: "is", value: [refCode] }] },
    }),
  });
  if (!res.ok) throw new Error(`search-lark returned ${res.status}`);
  const body = await res.json();
  if (body.code !== 0) throw new Error(`Lark error: ${body.msg}`);
  return body.data?.total ? body.data.items[0] : null;
}

serve(
  withCors(async (req) => {
    const { action, refCode, videoUrl, turnstileToken } = await req.json().catch(() => ({}));
    if (!["lookup", "submit"].includes(action) || typeof refCode !== "string" || !/^[A-Za-z0-9-]{4,40}$/.test(refCode.trim())) {
      return jsonResponse({ error: "Invalid request" }, 400);
    }
    const ref = refCode.trim();

    const ip = clientIp(req);
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await db
      .from("abuse_attempts").select("id", { count: "exact", head: true })
      .eq("bucket", "video").eq("client_ip", ip).gte("created_at", since);
    if ((count ?? 0) >= MAX_PER_IP) return jsonResponse({ error: "Too many attempts. Please wait a few minutes." }, 429);
    await db.from("abuse_attempts").insert({ bucket: "video", client_ip: ip });

    if (!(await verifyTurnstile(req, turnstileToken, "video"))) {
      return jsonResponse({ error: "Verification failed. Please refresh and try again." }, 403);
    }

    const record = await findRecord(ref);
    if (!record) return jsonResponse({ error: "Invalid registration reference code" }, 404);
    const f = record.fields;
    const summary = {
      participantName: f["Participant's Name"]?.[0]?.text ?? "",
      category: f.Category ?? "",
      subCategory: f["Sub Category"] ?? "",
      songTitle: f["Song Title"]?.[0]?.text ?? "",
      hasVideoSubmitted: Boolean(f["Video URL"]),
      existingVideoUrl: f["Video URL"]?.link,
    };
    if (action === "lookup") return jsonResponse(summary);

    if (summary.hasVideoSubmitted) return jsonResponse({ error: "A video was already submitted for this registration." }, 409);
    let url: URL;
    try {
      url = new URL(String(videoUrl ?? ""));
    } catch {
      return jsonResponse({ error: "Invalid video URL" }, 400);
    }
    if (url.protocol !== "https:" || url.href.length > 500) return jsonResponse({ error: "Invalid video URL" }, 400);

    const res = await fetch("https://hooks.kangritel.com/webhook/update-lark-record", {
      method: "PUT",
      headers: { Authorization: basicAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        ...LARK,
        record_id: record.record_id,
        fields: {
          "Video URL": { link: url.href, text: `${summary.participantName} - ${summary.category} - ${summary.subCategory}` },
        },
      }),
    });
    if (!res.ok) throw new Error(`update-lark-record returned ${res.status}`);
    return jsonResponse({ ok: true });
  }),
);
