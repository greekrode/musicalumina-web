import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { jsonResponse, withCors } from "../_shared/n8n.ts";
import { buildRemarksEmail, type RegistrantType } from "./email.ts";
import { renderRemarksSheet, type SheetAssets } from "./render.ts";

/**
 * remarks-sheets — jury comment sheets for a finished event (admin only).
 *
 *   { action: "status", eventId }
 *       -> { judges, registrants: [{ email, type, name, ready, sentAt, lastError, participants }], unknownJudges }
 *   { action: "send-test", eventId, testEmail } -> { sent: string[], failed: { email, error }[] }
 *   { action: "send-all", eventId } -> { queued }   (sends in the background)
 *   { action: "continue", eventId, startedAt }      (internal: next background batch)
 *   { action: "resend", eventId, email, type, registrationIds } -> { sent, failed }
 *       (sends now, only the chosen participants; any number of times)
 *
 * One PDF per verified registration (participant + category): the event's
 * template filled with name, category, repertoire and both judges' remarks
 * from event_scoring. PDFs are rendered in memory and attached to one email
 * per (registrant email, registrant type), like the LSPF 2026 mail script:
 * someone registered as both teacher and parent gets the teacher copy for
 * their students and the parent copy for their own children.
 *
 * A recipient is ready once every one of its registrations has finalized
 * scores with remarks from both judges, and is sent at most once per event
 * (remarks_sheet_sends; failed attempts keep their error there). "send-all"
 * answers at once and works through the ready recipients in the background,
 * SEND_BATCH per invocation, each batch calling the function again for the
 * next ("continue", authorised by the service role key), so the admin can
 * close the page. "send-test" sends one recipient's email (the ready one with
 * the longest remarks, else the first with SAMPLE_REMARKS) to testEmail only
 * and marks nothing sent.
 *
 * Mail goes out through Lark SMTP on port 465 (Supabase blocks 25 and 587),
 * as no-reply@musicalumina.com with replies to contact@musicalumina.com.
 *
 * The browser calls this with the anon key (the functions gateway accepts
 * Supabase JWTs only) and passes the admin's Clerk session token in
 * x-clerk-token; public.is_admin() must accept that token.
 */
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Recipients per invocation; each run then calls the function again for the next batch. */
const SEND_BATCH = 5;
/** Pause between emails so Lark SMTP does not throttle a bulk run. */
const SEND_GAP_MS = 3000;

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const SMTP_HOST = "smtp.larksuite.com";
const SMTP_PORT = 465;
const REPLY_TO = "contact@musicalumina.com";
const REGISTRANT_TYPES: Record<string, RegistrantType> = { teacher: "teacher", parents: "parents", personal: "personal" };

/** Test-send stand-in before any recipient is ready. */
const SAMPLE_REMARKS: [string, string] = [
  "Lovely tone and a confident start. Keep the left hand lighter so the melody sings above it, and shape each phrase towards its peak. Watch the tempo in the faster passages: steady practice with a metronome will help. Well done on a musical performance!",
  "Great stage presence and clear dynamics. Work on smoother legato between the hand positions and let the pedal changes follow the harmony. The ending could breathe a little more. Keep up the good work!",
];

/**
 * Templates live in the public-assets bucket (keep them small: every sheet
 * embeds the whole template). `judges` is the template's row order (top
 * first) and must match event_scoring.jury_name.
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

type JudgeStatus = "final" | "draft" | "none";

interface Participant {
  registrationId: string;
  name: string;
  category: string;
  song: string;
  remarks: [string, string];
  /** Per judge, in template order: finalized with remarks, written but not finalized, or nothing yet. */
  judgeStatus: JudgeStatus[];
  /** Latest successful email (send or resend) that carried this sheet. */
  sentAt: string | null;
}

interface Registrant {
  email: string;
  type: RegistrantType;
  name: string;
  participants: Participant[];
  ready: boolean;
  /** The "send to all ready" email; resends do not set it. */
  sentAt: string | null;
  /** Latest resend, if any. */
  resentAt: string | null;
  /** Latest failed send (background sends report here), cleared by a success. */
  lastError: { at: string; message: string } | null;
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
      id, participant_name, registrant_name, registrant_email, registrant_status, song_title,
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
    db.from("remarks_sheet_sends")
      .select("registrant_email, registrant_type, registration_ids, is_resend, sent_at, error")
      .eq("event_id", eventId)
      .eq("is_test", false)
      .order("sent_at"),
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
  const sentAt = new Map<string, string>();
  const resentAt = new Map<string, string>();
  const lastError = new Map<string, { at: string; message: string }>();
  const sheetSentAt = new Map<string, string>();
  for (const s of sendsRes.data ?? []) {
    const key = `${s.registrant_email} ${s.registrant_type}`;
    if (s.error) {
      if (!s.is_resend) lastError.set(key, { at: s.sent_at, message: s.error });
      continue;
    }
    (s.is_resend ? resentAt : sentAt).set(key, s.sent_at);
    for (const id of s.registration_ids ?? []) sheetSentAt.set(id, s.sent_at);
  }

  const byRecipient = new Map<string, Registrant>();
  for (const r of regs ?? []) {
    const email = String(r.registrant_email ?? "").trim().toLowerCase();
    if (!EMAIL.test(email)) continue;
    const type = REGISTRANT_TYPES[String(r.registrant_status ?? "").toLowerCase()] ?? "personal";
    const key = `${email} ${type}`;
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
      judgeStatus: judges.map((_, i): JudgeStatus => (!remarks[i] ? "none" : unlocked[i] ? "draft" : "final")),
      sentAt: sheetSentAt.get(r.id) ?? null,
    };
    const registrant: Registrant = byRecipient.get(key) ?? {
      email,
      type,
      name: String(r.registrant_name || r.participant_name || "").trim(),
      participants: [],
      ready: true,
      sentAt: sentAt.get(key) ?? null,
      resentAt: resentAt.get(key) ?? null,
      lastError: sentAt.has(key) ? null : lastError.get(key) ?? null,
    };
    registrant.participants.push(participant);
    registrant.ready &&= participant.judgeStatus.every((s) => s === "final");
    byRecipient.set(key, registrant);
  }
  return { registrants: [...byRecipient.values()], unknownJudges: [...unknownJudges] };
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

/**
 * denomailer encodes any non-ASCII subject as a single, unfolded
 * quoted-printable word that mail clients show raw (=?utf-8?Q?...=e2=80=93).
 * ASCII passes through untouched, so subjects and attachment names are
 * folded to ASCII: accents dropped, dashes and quotes mapped, the rest removed.
 */
function toAscii(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7e]/g, "");
}

async function sendRegistrant(smtp: SMTPClient, registrant: Registrant, to: string, eventTitle: string, assets: SheetAssets) {
  const attachments = [];
  let bytes = 0;
  for (const p of registrant.participants) {
    const pdf = await renderRemarksSheet(assets, { name: p.name, category: p.category, song: p.song, remarks: p.remarks });
    bytes += pdf.length;
    attachments.push({
      filename: toAscii(`${p.name} - ${p.category}.pdf`).replace(/[\\/:*?"<>|]/g, ""),
      content: pdf,
      encoding: "binary" as const,
      contentType: "application/pdf",
    });
  }
  if (bytes > MAX_ATTACHMENT_BYTES) {
    throw new Error(`attachments are ${(bytes / 2 ** 20).toFixed(1)} MB, over ${MAX_ATTACHMENT_BYTES / 2 ** 20} MB`);
  }
  const { subject, html } = buildRemarksEmail({
    type: registrant.type,
    registrantName: registrant.name,
    eventTitle,
    sheets: registrant.participants.map((p) => ({ participant: p.name, category: p.category })),
  });
  await smtp.send({
    from: `Musica Lumina <${Deno.env.get("SMTP_USERNAME")}>`,
    to,
    replyTo: REPLY_TO,
    subject: toAscii(subject),
    html,
    content: "auto",
    attachments,
  });
}

/**
 * Sends each recipient's email (to `testTo` instead when given). A row in
 * remarks_sheet_sends is claimed first so two runs cannot both send the
 * "send to all ready" email (resends are logged but not limited); a failed
 * send keeps its row with the error so the admin page can show it.
 */
async function sendBatch(
  eventId: string,
  template: string,
  batch: Registrant[],
  options: { testTo?: string; resend?: boolean } = {},
) {
  const testTo = options.testTo ?? null;
  const { data: event, error } = await db.from("events").select("title").eq("id", eventId).single();
  if (error) throw error;
  const assets = await loadAssets(template);
  const sent: string[] = [];
  const failed: { email: string; error: string }[] = [];
  const smtp = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: true,
      auth: { username: Deno.env.get("SMTP_USERNAME") ?? "", password: Deno.env.get("SMTP_PASSWORD") ?? "" },
    },
  });
  try {
    for (const [i, registrant] of batch.entries()) {
      if (i > 0) {
        const { promise, resolve } = Promise.withResolvers<void>();
        setTimeout(resolve, SEND_GAP_MS);
        await promise;
      }
      const { data: claim, error: claimError } = await db
        .from("remarks_sheet_sends")
        .insert({
          event_id: eventId,
          registrant_email: registrant.email,
          registrant_type: registrant.type,
          registration_ids: registrant.participants.map((p) => p.registrationId),
          is_test: testTo !== null,
          is_resend: options.resend === true,
          sent_to: testTo ?? registrant.email,
        })
        .select("id")
        .single();
      if (claimError) {
        failed.push({ email: registrant.email, error: claimError.code === "23505" ? "already sent" : claimError.message });
        continue;
      }
      try {
        await sendRegistrant(smtp, registrant, testTo ?? registrant.email, event.title, assets);
        sent.push(`${registrant.email} (${registrant.type})`);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error("remarks-sheets send failed", registrant.email, registrant.type, message);
        await db.from("remarks_sheet_sends").update({ error: message.slice(0, 500) }).eq("id", claim.id);
        failed.push({ email: registrant.email, error: message });
      }
    }
  } finally {
    await smtp.close();
  }
  return { sent, failed };
}

/**
 * One background step of "send to all ready": send a batch, then call this
 * function again for the next one, so no single invocation runs into the
 * edge function time limit. Recipients that already failed during this run
 * (since `startedAt`) are skipped so one bad address cannot stall the rest;
 * they stay pending for the next "send to all ready".
 */
async function sendStep(eventId: string, startedAt: string) {
  const sheet = SHEETS[eventId];
  const { registrants } = await loadRegistrants(eventId, sheet.judges);
  const pending = registrants.filter((r) => r.ready && !r.sentAt && !(r.lastError && r.lastError.at >= startedAt));
  if (pending.length === 0) return;
  const batch = pending.slice(0, SEND_BATCH);
  const { sent, failed } = await sendBatch(eventId, sheet.template, batch);
  console.log("remarks-sheets step", { eventId, sent: sent.length, failed: failed.length, left: pending.length - batch.length });
  if (pending.length > batch.length) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/remarks-sheets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ANON_KEY}`, "x-internal-key": SERVICE_ROLE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "continue", eventId, startedAt }),
    });
    if (!res.ok) console.error("remarks-sheets could not continue", res.status, await res.text());
  }
}

serve(
  withCors(async (req) => {
    const { action, eventId, testEmail, startedAt, email, type, registrationIds } = await req.json().catch(() => ({}));
    if (!UUID.test(String(eventId))) return jsonResponse({ error: "Invalid event" }, 400);
    const sheet = SHEETS[eventId];
    if (!sheet) return jsonResponse({ error: "This event has no remarks sheet template." }, 400);

    // Next step of a background run, called by the previous step only.
    if (action === "continue") {
      if (!SERVICE_ROLE_KEY || req.headers.get("x-internal-key") !== SERVICE_ROLE_KEY) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      EdgeRuntime.waitUntil(sendStep(eventId, String(startedAt)).catch((e) => console.error("remarks-sheets step failed", e)));
      return jsonResponse({ ok: true }, 202);
    }

    if (!(await isAdmin(req))) return jsonResponse({ error: "Admins only" }, 403);
    const { registrants, unknownJudges } = await loadRegistrants(eventId, sheet.judges);

    if (action === "status") {
      return jsonResponse({ judges: sheet.judges, registrants, unknownJudges });
    }

    // Starts the background run and answers at once; the page can be closed.
    if (action === "send-all") {
      const queued = registrants.filter((r) => r.ready && !r.sentAt).length;
      if (queued > 0) {
        EdgeRuntime.waitUntil(
          sendStep(eventId, new Date().toISOString()).catch((e) => console.error("remarks-sheets step failed", e)),
        );
      }
      return jsonResponse({ queued });
    }

    // Resend one recipient's email with the chosen participants, now. Only
    // sheets whose remarks are finalized by both judges can be included.
    if (action === "resend") {
      const recipient = registrants.find((r) => r.email === String(email ?? "").toLowerCase() && r.type === type);
      if (!recipient) return jsonResponse({ error: "Recipient not found" }, 404);
      const wanted = new Set(Array.isArray(registrationIds) ? registrationIds.map(String) : []);
      const participants = recipient.participants.filter((p) => wanted.has(p.registrationId));
      if (participants.length === 0) return jsonResponse({ error: "Choose at least one participant" }, 400);
      const notReady = participants.filter((p) => p.judgeStatus.some((s) => s !== "final")).map((p) => p.name);
      if (notReady.length) return jsonResponse({ error: `Remarks not finalized for ${notReady.join(", ")}` }, 400);
      return jsonResponse(await sendBatch(eventId, sheet.template, [{ ...recipient, participants }], { resend: true }));
    }

    if (action !== "send-test") return jsonResponse({ error: "Invalid action" }, 400);
    const to = String(testEmail ?? "").trim();
    if (!EMAIL.test(to)) return jsonResponse({ error: "Invalid test email" }, 400);

    // Test send: the ready recipient with the longest remarks (worst case for
    // the auto-sized text). Before anything is ready, the first recipient with
    // sample remarks, so the layout and email can be checked early.
    const remarksLength = (r: Registrant) =>
      r.participants.reduce((n, p) => n + p.remarks[0].length + p.remarks[1].length, 0);
    const ready = registrants.filter((r) => r.ready);
    const batch = ready.length
      ? [ready.reduce((a, b) => (remarksLength(b) > remarksLength(a) ? b : a))]
      : registrants.slice(0, 1).map((r) => ({
        ...r,
        participants: r.participants.map((p) => ({ ...p, remarks: [...SAMPLE_REMARKS] as [string, string] })),
      }));
    if (batch.length === 0) return jsonResponse({ sent: [], failed: [] });
    return jsonResponse(await sendBatch(eventId, sheet.template, batch, { testTo: to }));
  }),
);
