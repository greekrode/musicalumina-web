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
 *       -> { judges, registrants: [{ email, type, name, ready, sentAt, participants }], unknownJudges }
 *   { action: "send", eventId, testEmail? }
 *       -> { sent: string[], failed: { email, error }[], remaining }
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
 * (remarks_sheet_sends). "send" handles SEND_BATCH recipients per call; the
 * admin page calls again until remaining is 0. With testEmail it sends one
 * recipient's email (the ready one with the longest remarks, else the first
 * with SAMPLE_REMARKS) to testEmail instead and marks nothing sent.
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
const db = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEND_BATCH = 5;
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
  type: RegistrantType;
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
      .select("registrant_email, registrant_type, sent_at")
      .eq("event_id", eventId)
      .eq("is_test", false),
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
  const sentAt = new Map<string, string>(
    (sendsRes.data ?? []).map((s) => [`${s.registrant_email} ${s.registrant_type}`, s.sent_at]),
  );

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
      missing: judges.flatMap((judge, i) =>
        !remarks[i] ? [`${judge} (no remarks)`] : unlocked[i] ? [`${judge} (not finalized)`] : [],
      ),
    };
    const registrant: Registrant = byRecipient.get(key) ?? {
      email,
      type,
      name: String(r.registrant_name || r.participant_name || "").trim(),
      participants: [],
      ready: true,
      sentAt: sentAt.get(key) ?? null,
    };
    registrant.participants.push(participant);
    registrant.ready &&= participant.missing.length === 0;
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

async function sendRegistrant(smtp: SMTPClient, registrant: Registrant, to: string, eventTitle: string, assets: SheetAssets) {
  const attachments = [];
  let bytes = 0;
  for (const p of registrant.participants) {
    const pdf = await renderRemarksSheet(assets, { name: p.name, category: p.category, song: p.song, remarks: p.remarks });
    bytes += pdf.length;
    attachments.push({
      filename: `${p.name} - ${p.category}.pdf`.replace(/[\\/:*?"<>|]/g, ""),
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
    subject,
    html,
    content: "auto",
    attachments,
  });
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

    // Test send: the ready recipient with the longest remarks (worst case for
    // the auto-sized text). Before anything is ready, the first recipient with
    // sample remarks, so the layout and email can be checked early.
    const remarksLength = (r: Registrant) =>
      r.participants.reduce((n, p) => n + p.remarks[0].length + p.remarks[1].length, 0);
    const ready = registrants.filter((r) => r.ready);
    const batch = !isTest
      ? registrants.filter((r) => r.ready && !r.sentAt).slice(0, SEND_BATCH)
      : ready.length
      ? [ready.reduce((a, b) => (remarksLength(b) > remarksLength(a) ? b : a))]
      : registrants.slice(0, 1).map((r) => ({
        ...r,
        participants: r.participants.map((p) => ({ ...p, remarks: [...SAMPLE_REMARKS] as [string, string] })),
      }));
    const sent: string[] = [];
    const failed: { email: string; error: string }[] = [];
    if (batch.length === 0) return jsonResponse({ sent, failed, remaining: 0 });

    const smtp = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        tls: true,
        auth: { username: Deno.env.get("SMTP_USERNAME") ?? "", password: Deno.env.get("SMTP_PASSWORD") ?? "" },
      },
    });
    try {
      for (const registrant of batch) {
        // Claim first so two admins (or a double click) cannot send twice.
        const { data: claim, error: claimError } = await db
          .from("remarks_sheet_sends")
          .insert({
            event_id: eventId,
            registrant_email: registrant.email,
            registrant_type: registrant.type,
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
          await sendRegistrant(smtp, registrant, isTest ? to : registrant.email, event.title, assets);
          sent.push(`${registrant.email} (${registrant.type})`);
        } catch (e) {
          console.error("remarks-sheets send failed", registrant.email, e);
          await db.from("remarks_sheet_sends").delete().eq("id", claim.id);
          failed.push({ email: registrant.email, error: e instanceof Error ? e.message : String(e) });
        }
      }
    } finally {
      await smtp.close();
    }

    // Failed recipients stay pending; a batch that sends nothing means stop and look.
    const remaining = isTest ? 0 : registrants.filter((r) => r.ready && !r.sentAt).length - sent.length;
    return jsonResponse({ sent, failed, remaining });
  }),
);
