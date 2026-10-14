import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, signN8nJwt, withCors } from "../_shared/n8n.ts";
import { buildRemarksEmail, type SheetLink } from "./email.ts";
import { renderRemarksSheet, type SheetAssets } from "./render.ts";

/**
 * remarks-sheets — adjudicator remarks PDFs for a finished event (admin only).
 *
 *   { action: "status", eventId }
 *       -> { judges, registrants: [{ email, name, ready, sentAt, participants }], unknownJudges }
 *   { action: "send", eventId, testEmail? }
 *       -> { sent: string[], failed: { email, error }[], remaining }
 *
 * One PDF per scored registration (participant + category): the event's
 * template filled with name, category, repertoire and both judges' remarks
 * from event_scoring. Sheets are stored privately in the remarks-sheets bucket
 * and emailed as signed links, one email per registrant address covering all
 * of that address's participants. An address is only sent once every one of
 * its registrations has remarks from both judges, and at most once per event
 * (remarks_sheet_sends). "send" handles SEND_BATCH addresses per call; the
 * admin page calls again until remaining is 0. With testEmail it sends the
 * first ready address's email to testEmail instead and marks nothing sent.
 *
 * The browser calls this with the anon key (the functions gateway accepts
 * Supabase JWTs only) and passes the admin's Clerk session token in
 * x-clerk-token; public.is_admin() must accept that token.
 */
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const db = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const N8N_SEND_EMAIL = "https://hooks.kangritel.com/webhook/send-email";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEND_BATCH = 5;
const LINK_TTL_SECONDS = 365 * 24 * 60 * 60;
const BUCKET = "remarks-sheets";

/**
 * Templates live in the public-assets bucket. `judges` is the template's row
 * order (top first) and must match event_scoring.jury_name.
 */
const SHEETS: Record<string, { template: string; judges: [string, string] }> = {
  // Lumina Signature Piano Festival 2026 (2nd Edition)
  "7d267705-c591-4b98-8151-d8c91ebf2e31": {
    template: "remarks-sheets/lspf-2026-2nd/template.pdf",
    judges: ["Amelia Santoso", "Caitlin Wiranata"],
  },
};
const FONTS = {
  header: "remarks-sheets/fonts/LondrinaSolid-Regular.ttf",
  body: "remarks-sheets/fonts/Nunito-SemiBold.ttf",
};

interface Participant {
  registrationId: string;
  name: string;
  category: string;
  song: string;
  remarks: [string, string];
  missing: string[];
}

interface Registrant {
  email: string;
  name: string;
  participants: Participant[];
  ready: boolean;
  sentAt: string | null;
}

async function isAdmin(req: Request): Promise<boolean> {
  const token = req.headers.get("x-clerk-token");
  if (!token) return false;
  const asCaller = createClient(SUPABASE_URL, ANON_KEY, { accessToken: async () => token });
  const { data, error } = await asCaller.rpc("is_admin");
  return !error && data === true;
}

async function loadRegistrants(eventId: string, judges: [string, string]) {
  const { data: regs, error } = await db
    .from("registrations")
    .select(`
      id, participant_name, registrant_name, registrant_email, song_title,
      event_categories ( name ), event_subcategories ( name )
    `)
    .eq("event_id", eventId)
    .eq("status", "verified")
    .order("created_at");
  if (error) throw error;
  const ids = (regs ?? []).map((r) => r.id);

  const [scoresRes, sendsRes] = await Promise.all([
    ids.length
      ? db.from("event_scoring").select("registration_id, jury_name, remarks, finalized").in("registration_id", ids)
      : Promise.resolve({ data: [], error: null }),
    db.from("remarks_sheet_sends").select("registrant_email, sent_at").eq("event_id", eventId).eq("is_test", false),
  ]);
  if (scoresRes.error) throw scoresRes.error;
  if (sendsRes.error) throw sendsRes.error;

  // Judge names compared case- and spacing-insensitively.
  const judgeIndex = new Map(judges.map((j, i) => [j.trim().replace(/\s+/g, " ").toLowerCase(), i]));
  const remarksByReg = new Map<string, [string, string]>();
  // Remarks only count once the score is finalized (locked); until then a
  // judge can still edit them, so the sheet must not go out.
  const unlockedByReg = new Map<string, [boolean, boolean]>();
  const unknownJudges = new Set<string>();
  for (const s of scoresRes.data ?? []) {
    const index = judgeIndex.get(String(s.jury_name ?? "").trim().replace(/\s+/g, " ").toLowerCase());
    if (index === undefined) {
      unknownJudges.add(String(s.jury_name ?? ""));
      continue;
    }
    const pair = remarksByReg.get(s.registration_id) ?? ["", ""];
    pair[index] = String(s.remarks ?? "").trim();
    remarksByReg.set(s.registration_id, pair);
    const unlocked = unlockedByReg.get(s.registration_id) ?? [false, false];
    unlocked[index] = s.finalized !== true;
    unlockedByReg.set(s.registration_id, unlocked);
  }
  const sentAt = new Map<string, string>((sendsRes.data ?? []).map((s) => [s.registrant_email, s.sent_at]));

  const byEmail = new Map<string, Registrant>();
  for (const r of regs ?? []) {
    const email = String(r.registrant_email ?? "").trim().toLowerCase();
    if (!EMAIL.test(email)) continue;
    const cat = Array.isArray(r.event_categories) ? r.event_categories[0] : r.event_categories;
    const sub = Array.isArray(r.event_subcategories) ? r.event_subcategories[0] : r.event_subcategories;
    const remarks = remarksByReg.get(r.id) ?? ["", ""];
    const unlocked = unlockedByReg.get(r.id) ?? [false, false];
    const participant: Participant = {
      registrationId: r.id,
      name: String(r.participant_name ?? "").trim(),
      category: [cat?.name, sub?.name].filter(Boolean).join(" - "),
      song: String(r.song_title ?? "").trim(),
      remarks,
      missing: judges.flatMap((judge, i) =>
        !remarks[i] ? [`${judge} (no remarks)`] : unlocked[i] ? [`${judge} (not finalized)`] : [],
      ),
    };
    const registrant: Registrant = byEmail.get(email) ?? {
      email,
      name: String(r.registrant_name || r.participant_name || "").trim(),
      participants: [],
      ready: true,
      sentAt: sentAt.get(email) ?? null,
    };
    registrant.participants.push(participant);
    registrant.ready &&= participant.missing.length === 0;
    byEmail.set(email, registrant);
  }
  return { registrants: [...byEmail.values()], unknownJudges: [...unknownJudges] };
}

async function loadAssets(template: string): Promise<SheetAssets> {
  const [t, h, b] = await Promise.all(
    [template, FONTS.header, FONTS.body].map(async (path) => {
      const { data, error } = await db.storage.from("public-assets").download(path);
      if (error || !data) throw new Error(`Missing asset public-assets/${path}`);
      return new Uint8Array(await data.arrayBuffer());
    }),
  );
  return { template: t, headerFont: h, bodyFont: b };
}

async function sendRegistrant(
  registrant: Registrant,
  to: string,
  eventId: string,
  eventTitle: string,
  assets: SheetAssets,
) {
  const sheets: SheetLink[] = [];
  for (const p of registrant.participants) {
    const pdf = await renderRemarksSheet(assets, { name: p.name, category: p.category, song: p.song, remarks: p.remarks });
    const path = `${eventId}/${p.registrationId}.pdf`;
    const up = await db.storage.from(BUCKET).upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (up.error) throw up.error;
    const signed = await db.storage.from(BUCKET).createSignedUrl(path, LINK_TTL_SECONDS, {
      download: `Remarks - ${p.name} - ${p.category}.pdf`.replace(/[\\/:*?"<>|]/g, ""),
    });
    if (signed.error || !signed.data) throw signed.error ?? new Error("Could not sign link");
    sheets.push({ participant: p.name, category: p.category, song: p.song, url: signed.data.signedUrl });
  }
  const { subject, html } = buildRemarksEmail({ registrantName: registrant.name, eventTitle, sheets });
  const res = await fetch(N8N_SEND_EMAIL, {
    method: "POST",
    headers: { Authorization: `Bearer ${await signN8nJwt()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: to, subject, message: html }),
  });
  if (!res.ok) throw new Error(`send-email returned ${res.status}`);
}

serve(
  withCors(async (req) => {
    if (!(await isAdmin(req))) return jsonResponse({ error: "Admins only" }, 403);
    const { action, eventId, testEmail } = await req.json().catch(() => ({}));
    if (!UUID.test(String(eventId))) return jsonResponse({ error: "Invalid event" }, 400);
    const sheet = SHEETS[eventId];
    if (!sheet) return jsonResponse({ error: "This event has no remarks sheet template." }, 400);

    const { registrants, unknownJudges } = await loadRegistrants(eventId, sheet.judges);

    if (action === "status") {
      return jsonResponse({ judges: sheet.judges, registrants, unknownJudges });
    }
    if (action !== "send") return jsonResponse({ error: "Invalid action" }, 400);

    const isTest = testEmail !== undefined;
    const to = String(testEmail ?? "").trim();
    if (isTest && !EMAIL.test(to)) return jsonResponse({ error: "Invalid test email" }, 400);

    const { data: event, error } = await db.from("events").select("title").eq("id", eventId).single();
    if (error) throw error;
    const assets = await loadAssets(sheet.template);

    const pending = registrants.filter((r) => r.ready && (isTest || !r.sentAt));
    const batch = pending.slice(0, isTest ? 1 : SEND_BATCH);
    const sent: string[] = [];
    const failed: { email: string; error: string }[] = [];

    for (const registrant of batch) {
      // Claim first so two admins (or a double click) cannot send twice.
      const { data: claim, error: claimError } = await db
        .from("remarks_sheet_sends")
        .insert({
          event_id: eventId,
          registrant_email: registrant.email,
          registration_ids: registrant.participants.map((p) => p.registrationId),
          is_test: isTest,
          sent_to: isTest ? to : registrant.email,
        })
        .select("id")
        .single();
      if (claimError) {
        failed.push({ email: registrant.email, error: claimError.code === "23505" ? "already sent" : claimError.message });
        continue;
      }
      try {
        await sendRegistrant(registrant, isTest ? to : registrant.email, eventId, event.title, assets);
        sent.push(registrant.email);
      } catch (e) {
        console.error("remarks-sheets send failed", registrant.email, e);
        await db.from("remarks_sheet_sends").delete().eq("id", claim.id);
        failed.push({ email: registrant.email, error: e instanceof Error ? e.message : String(e) });
      }
    }

    // Failed addresses stay pending; a batch that sends nothing means stop and look.
    const remaining = isTest ? 0 : registrants.filter((r) => r.ready && !r.sentAt).length - sent.length;
    return jsonResponse({ sent, failed, remaining });
  }),
);
