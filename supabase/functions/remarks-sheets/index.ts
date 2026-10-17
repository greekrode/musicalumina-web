import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Buffer } from "node:buffer";
import nodemailer from "npm:nodemailer@6.9.16";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, withCors } from "../_shared/n8n.ts";
import { buildRemarksEmail, type RegistrantType } from "./email.ts";
import { renderRemarksSheet, type SheetAssets } from "./render.ts";

/**
 * remarks-sheets — jury comment sheets for a finished event (admin only).
 *
 *   { action: "status", eventId }
 *       -> { judges, registrants: [{ email, type, name, ready, sentAt, resentAt, lastError, lastAttemptAt, participants }], unknownJudges }
 *   { action: "send-test", eventId, testEmail } -> { sent: string[], failed: { email, error }[] }
 *   { action: "send-all", eventId, includeSent? } -> { queued }   (background)
 *   { action: "resend", eventId, email, type, registrationIds } -> { queued }   (background)
 *   { action: "continue", eventId, run }   (internal: next background step)
 *
 * One PDF per verified registration (participant + category): the event's
 * template filled with name, category, repertoire and both judges' remarks
 * from event_scoring, attached to one email per (registrant email,
 * registrant type), so someone registered as both teacher and parent gets the
 * teacher copy for their students and the parent copy for their own children.
 *
 * A sheet is sendable once both judges' scores, with remarks, are finalized.
 * In a completed event, a participant with no remarks from either judge in a
 * category whose scores are all finalized did not perform: they get no sheet
 * and do not hold their recipient back. A recipient is ready once all of its
 * other participants are sendable and at least one is.
 *
 * Background runs ("send-all", "resend") work one recipient at a time, each
 * step a separate invocation that calls the function again ("continue",
 * authorised by the service role key), so the admin can close the page and no
 * invocation runs into the edge function CPU limit: a step either renders up
 * to RENDER_PER_STEP of the recipient's sheets into the remarks-sheets bucket
 * or, once all are rendered, emails them. A recipient is done for a run once
 * remarks_sheet_sends has a row for it since the run started; that row is
 * written after Lark accepts the email (or with the error), never before.
 * "send-all" covers ready recipients not yet emailed, or with includeSent
 * every ready one (already emailed ones as resends). Only the "send to all"
 * email counts as sent; resends are logged but not limited.
 *
 * "send-test" emails, right away, the ready recipient with at most
 * TEST_MAX_SHEETS sheets and the longest remarks (before anything is ready,
 * the first recipient with SAMPLE_REMARKS) to testEmail only.
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
/** Sheets rendered per background step; rendering is most of the CPU cost. */
const RENDER_PER_STEP = 3;
/** Largest recipient a test send picks, so the test finishes within one invocation. */
const TEST_MAX_SHEETS = 3;
/** Random pause before each background email so Lark SMTP does not throttle a bulk run. */
const SEND_GAP_MIN_MS = 1000;
const SEND_GAP_MAX_MS = 3000;
/** Private scratch bucket for rendered sheets of a running send. */
const RENDER_BUCKET = "remarks-sheets";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
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
  /** Did not perform (see the header comment): no sheet, does not block the recipient. */
  absent: boolean;
  /** Latest successful email (send or resend) that carried this sheet. */
  sentAt: string | null;
}

interface Registrant {
  email: string;
  type: RegistrantType;
  name: string;
  participants: Participant[];
  ready: boolean;
  /** The "send to all" email; resends do not set it. */
  sentAt: string | null;
  /** Latest resend, if any. */
  resentAt: string | null;
  /** Latest failed "send to all" attempt, cleared by a success. */
  lastError: { at: string; message: string } | null;
  /** Latest logged attempt of any kind (send, resend, success or failure); marks the recipient done for a run. */
  lastAttemptAt: string | null;
}

/** A background send: which recipients, and since when an attempt counts as done. */
interface Run {
  startedAt: string;
  includeSent: boolean;
  /** Resend: one recipient with just these sheets. */
  only?: { email: string; type: string; registrationIds: string[] };
}

async function isAdmin(req: Request): Promise<boolean> {
  const token = req.headers.get("x-clerk-token");
  if (!token) return false;
  const asCaller = createClient(SUPABASE_URL, ANON_KEY, { accessToken: async () => token });
  const { data, error } = await asCaller.rpc("is_admin");
  return !error && data === true;
}

const sendable = (p: Participant) => !p.absent && p.judgeStatus.every((s) => s === "final");

async function loadRegistrants(eventId: string, judges: [string, string]) {
  const [eventRes, regsRes] = await Promise.all([
    db.from("events").select("status").eq("id", eventId).single(),
    db
      .from("registrations")
      .select(`
        id, participant_name, registrant_name, registrant_email, registrant_status, song_title,
        category_id, subcategory_id, event_categories ( name ), event_subcategories ( name )
      `)
      .eq("event_id", eventId)
      .eq("status", "verified")
      .order("created_at"),
  ]);
  if (eventRes.error) throw eventRes.error;
  if (regsRes.error) throw regsRes.error;
  const regs = regsRes.data ?? [];
  const ids = regs.map((r) => r.id);

  const [scoresRes, sendsRes] = await Promise.all([
    ids.length
      ? db.from("event_scoring")
        .select("registration_id, category_id, subcategory_id, jury_name, remarks, finalized")
        .in("registration_id", ids)
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
  const normalize = (name: unknown) => String(name ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  const judgeIndex = new Map(judges.map((j, i) => [normalize(j), i]));
  const remarksByReg = new Map<string, [string, string]>();
  // Remarks only count once the score is finalized (locked); until then a
  // judge can still edit them, so the sheet must not go out.
  const unlockedByReg = new Map<string, [boolean, boolean]>();
  // Category + subcategory with at least one score not finalized yet.
  const openCategory = new Map<string, boolean>();
  const unknownJudges = new Set<string>();
  for (const s of scoresRes.data ?? []) {
    const category = `${s.category_id} ${s.subcategory_id}`;
    openCategory.set(category, (openCategory.get(category) ?? false) || s.finalized !== true);
    const index = judgeIndex.get(normalize(s.jury_name));
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
  const lastAttemptAt = new Map<string, string>();
  const sheetSentAt = new Map<string, string>();
  for (const s of sendsRes.data ?? []) {
    const key = `${s.registrant_email} ${s.registrant_type}`;
    lastAttemptAt.set(key, s.sent_at);
    if (s.error) {
      if (!s.is_resend) lastError.set(key, { at: s.sent_at, message: s.error });
      continue;
    }
    (s.is_resend ? resentAt : sentAt).set(key, s.sent_at);
    for (const id of s.registration_ids ?? []) sheetSentAt.set(id, s.sent_at);
  }

  const eventCompleted = eventRes.data.status === "completed";
  const byRecipient = new Map<string, Registrant>();
  for (const r of regs) {
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
      absent: eventCompleted && !remarks[0] && !remarks[1] && openCategory.get(`${r.category_id} ${r.subcategory_id}`) === false,
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
      lastAttemptAt: lastAttemptAt.get(key) ?? null,
    };
    registrant.participants.push(participant);
    registrant.ready &&= participant.absent || sendable(participant);
    byRecipient.set(key, registrant);
  }
  const registrants = [...byRecipient.values()];
  for (const r of registrants) r.ready &&= r.participants.some(sendable);
  return { registrants, unknownJudges: [...unknownJudges] };
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

/** Emails one recipient its sheets (rendered PDFs in `pdfs`, same order) at `to`; resolves once Lark accepts it. */
async function sendEmail(eventId: string, registrant: Registrant, sheets: Participant[], pdfs: Uint8Array[], to: string) {
  const bytes = pdfs.reduce((n, pdf) => n + pdf.length, 0);
  if (bytes > MAX_ATTACHMENT_BYTES) {
    throw new Error(`attachments are ${(bytes / 2 ** 20).toFixed(1)} MB, over ${MAX_ATTACHMENT_BYTES / 2 ** 20} MB`);
  }
  const { data: event, error } = await db.from("events").select("title").eq("id", eventId).single();
  if (error) throw error;
  const { subject, html } = buildRemarksEmail({
    type: registrant.type,
    registrantName: registrant.name,
    eventTitle: event.title,
    sheets: sheets.map((p) => ({ participant: p.name, category: p.category })),
  });
  const username = Deno.env.get("SMTP_USERNAME") ?? "";
  const mailer = nodemailer.createTransport({
    host: "smtp.larksuite.com",
    port: 465,
    secure: true,
    auth: { user: username, pass: Deno.env.get("SMTP_PASSWORD") ?? "" },
  });
  try {
    const info = await mailer.sendMail({
      from: `Musica Lumina <${username}>`,
      to,
      replyTo: REPLY_TO,
      subject,
      html,
      attachments: sheets.map((p, i) => ({
        filename: `${p.name} - ${p.category}.pdf`.replace(/[\\/:*?"<>|]/g, ""),
        content: Buffer.from(pdfs[i]),
        contentType: "application/pdf",
      })),
    });
    console.log("remarks-sheets sent", to, info.response);
  } finally {
    mailer.close();
  }
}

async function logSend(
  eventId: string,
  registrant: Registrant,
  sheets: Participant[],
  options: { testTo?: string; resend: boolean; error: string | null },
) {
  const { error } = await db.from("remarks_sheet_sends").insert({
    event_id: eventId,
    registrant_email: registrant.email,
    registrant_type: registrant.type,
    registration_ids: sheets.map((p) => p.registrationId),
    is_test: options.testTo !== undefined,
    is_resend: options.resend,
    sent_to: options.testTo ?? registrant.email,
    error: options.error?.slice(0, 500) ?? null,
  });
  if (error) console.error("remarks-sheets could not log send", registrant.email, registrant.type, error.message);
}

/** The run's recipients still to do, each with the sheets it gets. */
function pendingFor(registrants: Registrant[], run: Run): { registrant: Registrant; sheets: Participant[] }[] {
  const since = Date.parse(run.startedAt);
  const done = (r: Registrant) => r.lastAttemptAt !== null && Date.parse(r.lastAttemptAt) >= since;
  if (run.only) {
    const { email, type, registrationIds } = run.only;
    const recipient = registrants.find((r) => r.email === email && r.type === type);
    if (!recipient || done(recipient)) return [];
    const sheets = recipient.participants.filter((p) => registrationIds.includes(p.registrationId) && sendable(p));
    return sheets.length ? [{ registrant: recipient, sheets }] : [];
  }
  return registrants
    .filter((r) => r.ready && (run.includeSent || !r.sentAt) && !done(r))
    .map((r) => ({ registrant: r, sheets: r.participants.filter(sendable) }));
}

/**
 * One background step: render the next few sheets of the run's first pending
 * recipient, or email them once all are rendered, then hand over to the next
 * invocation. Every email (or failure) is logged, so the run always moves on.
 */
async function sendStep(eventId: string, run: Run) {
  const sheet = SHEETS[eventId];
  const { registrants } = await loadRegistrants(eventId, sheet.judges);
  const pending = pendingFor(registrants, run);
  const folder = `runs/${Date.parse(run.startedAt)}`;
  const { data: files, error: listError } = await db.storage.from(RENDER_BUCKET).list(folder, { limit: 1000 });
  if (listError) throw listError;
  if (pending.length === 0) {
    if (files.length) await db.storage.from(RENDER_BUCKET).remove(files.map((f) => `${folder}/${f.name}`));
    console.log("remarks-sheets run done", { eventId, startedAt: run.startedAt });
    return;
  }

  const { registrant, sheets } = pending[0];
  const resend = run.only !== undefined || registrant.sentAt !== null;
  const rendered = new Set(files.map((f) => f.name));
  const paths = sheets.map((p) => `${folder}/${p.registrationId}.pdf`);
  const missing = sheets.filter((p) => !rendered.has(`${p.registrationId}.pdf`));
  try {
    if (missing.length) {
      const assets = await loadAssets(sheet.template);
      for (const p of missing.slice(0, RENDER_PER_STEP)) {
        const pdf = await renderRemarksSheet(assets, p);
        const { error } = await db.storage.from(RENDER_BUCKET)
          .upload(`${folder}/${p.registrationId}.pdf`, pdf, { contentType: "application/pdf", upsert: true });
        if (error) throw error;
      }
    } else {
      const pdfs = await Promise.all(paths.map(async (path) => {
        const { data, error } = await db.storage.from(RENDER_BUCKET).download(path);
        if (error || !data) throw new Error(`Missing rendered sheet ${path}`);
        return new Uint8Array(await data.arrayBuffer());
      }));
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, SEND_GAP_MIN_MS + Math.random() * (SEND_GAP_MAX_MS - SEND_GAP_MIN_MS));
      await promise;
      await sendEmail(eventId, registrant, sheets, pdfs, registrant.email);
      await logSend(eventId, registrant, sheets, { resend, error: null });
      await db.storage.from(RENDER_BUCKET).remove(paths);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("remarks-sheets send failed", registrant.email, registrant.type, message);
    await logSend(eventId, registrant, sheets, { resend, error: message });
    await db.storage.from(RENDER_BUCKET).remove(paths);
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/remarks-sheets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON_KEY}`, "x-internal-key": SERVICE_ROLE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "continue", eventId, run }),
  });
  if (!res.ok) console.error("remarks-sheets could not continue", res.status, await res.text());
}

function startRun(eventId: string, run: Run) {
  EdgeRuntime.waitUntil(sendStep(eventId, run).catch((e) => console.error("remarks-sheets step failed", e)));
}

serve(
  withCors(async (req) => {
    const { action, eventId, testEmail, run, includeSent, email, type, registrationIds } = await req.json().catch(() => ({}));
    if (!UUID.test(String(eventId))) return jsonResponse({ error: "Invalid event" }, 400);
    const sheet = SHEETS[eventId];
    if (!sheet) return jsonResponse({ error: "This event has no remarks sheet template." }, 400);

    // Next step of a background run, called by the previous step only.
    if (action === "continue") {
      if (!SERVICE_ROLE_KEY || req.headers.get("x-internal-key") !== SERVICE_ROLE_KEY) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      startRun(eventId, run as Run);
      return jsonResponse({ ok: true }, 202);
    }

    if (!(await isAdmin(req))) return jsonResponse({ error: "Admins only" }, 403);
    const { registrants, unknownJudges } = await loadRegistrants(eventId, sheet.judges);

    if (action === "status") {
      return jsonResponse({ judges: sheet.judges, registrants, unknownJudges });
    }

    // Starts the background run and answers at once; the page can be closed.
    if (action === "send-all") {
      const next: Run = { startedAt: new Date().toISOString(), includeSent: includeSent === true };
      const queued = pendingFor(registrants, next).length;
      if (queued > 0) startRun(eventId, next);
      return jsonResponse({ queued, startedAt: next.startedAt });
    }

    // Resend one recipient's email with the chosen participants, in the
    // background. Only finalized sheets can be included.
    if (action === "resend") {
      const recipient = registrants.find((r) => r.email === String(email ?? "").toLowerCase() && r.type === type);
      if (!recipient) return jsonResponse({ error: "Recipient not found" }, 404);
      const wanted = Array.isArray(registrationIds) ? registrationIds.map(String) : [];
      const participants = recipient.participants.filter((p) => wanted.includes(p.registrationId));
      if (participants.length === 0) return jsonResponse({ error: "Choose at least one participant" }, 400);
      const notReady = participants.filter((p) => !sendable(p)).map((p) => p.name);
      if (notReady.length) return jsonResponse({ error: `Remarks not finalized for ${notReady.join(", ")}` }, 400);
      const next: Run = {
        startedAt: new Date().toISOString(),
        includeSent: true,
        only: { email: recipient.email, type: recipient.type, registrationIds: wanted },
      };
      startRun(eventId, next);
      return jsonResponse({ queued: 1, startedAt: next.startedAt });
    }

    if (action !== "send-test") return jsonResponse({ error: "Invalid action" }, 400);
    const to = String(testEmail ?? "").trim();
    if (!EMAIL.test(to)) return jsonResponse({ error: "Invalid test email" }, 400);

    // Test send: the small ready recipient with the longest remarks (worst
    // case for the auto-sized text). Before anything is ready, the first
    // recipient with sample remarks, so the layout and email can be checked early.
    const remarksLength = (r: Registrant) =>
      r.participants.reduce((n, p) => n + p.remarks[0].length + p.remarks[1].length, 0);
    const small = registrants.filter((r) => r.ready && r.participants.filter(sendable).length <= TEST_MAX_SHEETS);
    const pick = small.length
      ? small.reduce((a, b) => (remarksLength(b) > remarksLength(a) ? b : a))
      : registrants[0] && {
        ...registrants[0],
        participants: registrants[0].participants.slice(0, TEST_MAX_SHEETS)
          .map((p) => ({ ...p, absent: false, judgeStatus: ["final", "final"] as JudgeStatus[], remarks: [...SAMPLE_REMARKS] as [string, string] })),
      };
    if (!pick) return jsonResponse({ sent: [], failed: [] });
    const sheets = pick.participants.filter(sendable);
    try {
      const assets = await loadAssets(sheet.template);
      const pdfs: Uint8Array[] = [];
      for (const p of sheets) pdfs.push(await renderRemarksSheet(assets, p));
      await sendEmail(eventId, pick, sheets, pdfs, to);
      await logSend(eventId, pick, sheets, { testTo: to, resend: false, error: null });
      return jsonResponse({ sent: [`${pick.email} (${pick.type})`], failed: [] });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await logSend(eventId, pick, sheets, { testTo: to, resend: false, error: message });
      return jsonResponse({ sent: [], failed: [{ email: pick.email, error: message }] });
    }
  }),
);
