/**
 * Sends remarks sheets from this machine instead of the edge function (whose
 * 2 s CPU limit stops a background run on recipients with many sheets).
 *
 *   deno run -A --node-modules-dir=none --no-check scripts/remarks-sheets-send.ts         # dry run: who gets what
 *   deno run -A --node-modules-dir=none --no-check scripts/remarks-sheets-send.ts --send  # ready, not yet emailed
 *   ... --send --include-sent   # also re-email already sent recipients (logged as resends)
 *   ... --test-to=you@example.com   # first pending recipient's email, to you only
 *
 * (--node-modules-dir=none: use Deno's own npm cache, not the web app's
 * node_modules; --no-check: esm.sh's fontkit types lack the default export
 * that the runtime module has.)
 *
 * Reads SUPABASE_SERVICE_ROLE_KEY, SMTP_USERNAME, SMTP_PASSWORD from
 * ~/.config/musicalumina/remarks.env. Same readiness rules as the function,
 * plus: in a completed event, a participant with no remarks from either judge
 * in a category whose scores are all finalized did not perform; they get no
 * sheet and do not hold their recipient back.
 *
 * A remarks_sheet_sends row is written after each email is accepted by Lark
 * (or with the error when it is not), so the admin page shows progress.
 */
import { Buffer } from "node:buffer";
import nodemailer from "npm:nodemailer@6.9.16";
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildRemarksEmail, type RegistrantType } from "../supabase/functions/remarks-sheets/email.ts";
import { renderRemarksSheet, type SheetAssets } from "../supabase/functions/remarks-sheets/render.ts";

const EVENT_ID = "7d267705-c591-4b98-8151-d8c91ebf2e31"; // LSPF 2026 (2nd Edition)
const TEMPLATE = "remarks-sheets/lspf-2026-2nd/template.pdf";
const JUDGES = ["Amelia Santoso", "Caitlin Wiranata"];
const FONTS = ["remarks-sheets/fonts/LondrinaSolid-Regular.ttf", "remarks-sheets/fonts/Nunito-SemiBold.ttf"];
const SUPABASE_URL = "https://gmkztaeonvcdrrmwxlnm.supabase.co";
const REPLY_TO = "contact@musicalumina.com";
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const REGISTRANT_TYPES: Record<string, RegistrantType> = { teacher: "teacher", parents: "parents", personal: "personal" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const send = Deno.args.includes("--send");
const includeSent = Deno.args.includes("--include-sent");
// --skip=email:type (repeatable): leave a recipient out of this run.
const skip = new Set(Deno.args.filter((a) => a.startsWith("--skip=")).map((a) => a.slice(7).replace(":", " ").toLowerCase()));
const testTo = Deno.args.find((a) => a.startsWith("--test-to="))?.slice(10) ?? null;

const envFile = `${Deno.env.get("HOME")}/.config/musicalumina/remarks.env`;
const env = Object.fromEntries(
  (await Deno.readTextFile(envFile))
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()]),
);
for (const key of ["SUPABASE_SERVICE_ROLE_KEY", "SMTP_USERNAME", "SMTP_PASSWORD"]) {
  if (!env[key]) throw new Error(`${key} missing in ${envFile}`);
}
const db = createClient(SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface Sheet { registrationId: string; name: string; category: string; song: string; remarks: [string, string] }
interface Recipient { email: string; type: RegistrantType; name: string; sheets: Sheet[]; absent: string[]; blocked: string[]; sentAt: string | null }

const [eventRes, regsRes, sendsRes] = await Promise.all([
  db.from("events").select("title, status").eq("id", EVENT_ID).single(),
  db.from("registrations")
    .select("id, participant_name, registrant_name, registrant_email, registrant_status, song_title, category_id, subcategory_id, event_categories ( name ), event_subcategories ( name )")
    .eq("event_id", EVENT_ID).eq("status", "verified").order("created_at"),
  db.from("remarks_sheet_sends").select("registrant_email, registrant_type, is_resend, sent_at, error")
    .eq("event_id", EVENT_ID).eq("is_test", false),
]);
for (const res of [eventRes, regsRes, sendsRes]) if (res.error) throw res.error;
const regs = regsRes.data!;
const scoresRes = await db.from("event_scoring")
  .select("registration_id, category_id, subcategory_id, jury_name, remarks, finalized")
  .in("registration_id", regs.map((r) => r.id));
if (scoresRes.error) throw scoresRes.error;

const normalize = (name: unknown) => String(name ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const judgeIndex = new Map(JUDGES.map((j, i) => [normalize(j), i]));
const remarksByReg = new Map<string, [string, string]>();
const finalByReg = new Map<string, [boolean, boolean]>();
// Category (+ subcategory) whose every score is finalized.
const categoryOpen = new Map<string, boolean>();
for (const s of scoresRes.data!) {
  const category = `${s.category_id} ${s.subcategory_id}`;
  categoryOpen.set(category, (categoryOpen.get(category) ?? false) || s.finalized !== true);
  const index = judgeIndex.get(normalize(s.jury_name));
  if (index === undefined) continue;
  const remarks = remarksByReg.get(s.registration_id) ?? ["", ""];
  remarks[index] = String(s.remarks ?? "").trim();
  remarksByReg.set(s.registration_id, remarks);
  const final = finalByReg.get(s.registration_id) ?? [false, false];
  final[index] = s.finalized === true;
  finalByReg.set(s.registration_id, final);
}
const sentAt = new Map<string, string>();
for (const s of sendsRes.data!) {
  if (!s.error && !s.is_resend) sentAt.set(`${s.registrant_email} ${s.registrant_type}`, s.sent_at);
}

const eventCompleted = eventRes.data!.status === "completed";
const recipients = new Map<string, Recipient>();
for (const r of regs) {
  const email = String(r.registrant_email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) continue;
  const type = REGISTRANT_TYPES[String(r.registrant_status ?? "").toLowerCase()] ?? "personal";
  const key = `${email} ${type}`;
  const recipient = recipients.get(key) ?? {
    email, type, name: String(r.registrant_name || r.participant_name || "").trim(),
    sheets: [], absent: [], blocked: [], sentAt: sentAt.get(key) ?? null,
  };
  recipients.set(key, recipient);
  const cat = Array.isArray(r.event_categories) ? r.event_categories[0] : r.event_categories;
  const sub = Array.isArray(r.event_subcategories) ? r.event_subcategories[0] : r.event_subcategories;
  const name = String(r.participant_name ?? "").trim();
  const category = [cat?.name, sub?.name].filter(Boolean).join(" - ");
  const remarks = remarksByReg.get(r.id) ?? ["", ""];
  const final = finalByReg.get(r.id) ?? [false, false];
  const categoryKey = `${r.category_id} ${r.subcategory_id}`;
  if (eventCompleted && !remarks[0] && !remarks[1] && categoryOpen.get(categoryKey) === false) {
    recipient.absent.push(`${name} (${category})`);
  } else if (remarks.every(Boolean) && final.every(Boolean)) {
    recipient.sheets.push({ registrationId: r.id, name, category, song: String(r.song_title ?? "").trim(), remarks });
  } else {
    recipient.blocked.push(`${name} (${category})`);
  }
}

const all = [...recipients.values()];
const ready = all.filter((r) => r.blocked.length === 0 && r.sheets.length > 0);
const pending = ready.filter((r) => (includeSent || !r.sentAt) && !skip.has(`${r.email} ${r.type}`));
// A test sends the first pending recipient's real email to testTo only (logged as a test, never as sent).
const queue = testTo ? pending.slice(0, 1) : pending;
console.log(`${all.length} recipients · ${ready.length} ready · ${ready.filter((r) => r.sentAt).length} already sent · ${queue.length} to send`);
for (const r of all.filter((r) => r.blocked.length)) console.log(`  waiting  ${r.email} (${r.type}): ${r.blocked.join(", ")}`);
for (const r of all.filter((r) => r.absent.length)) console.log(`  absent   ${r.email} (${r.type}): ${r.absent.join(", ")}`);
for (const r of queue) console.log(`  ${r.sentAt ? "resend" : "send  "}   ${r.email} (${r.type}): ${r.sheets.length} sheet(s)`);
if (!send && !testTo) {
  console.log("\nDry run. Add --send to email them.");
  Deno.exit(0);
}

const [template, headerFont, bodyFont] = await Promise.all([TEMPLATE, ...FONTS].map(async (path) => {
  const { data, error } = await db.storage.from("public-assets").download(path);
  if (error || !data) throw new Error(`Missing asset public-assets/${path}`);
  return new Uint8Array(await data.arrayBuffer());
}));
const assets: SheetAssets = { template, headerFont, bodyFont };
const mailer = nodemailer.createTransport({
  host: "smtp.larksuite.com", port: 465, secure: true,
  auth: { user: env.SMTP_USERNAME, pass: env.SMTP_PASSWORD },
});
await mailer.verify();

let sent = 0;
const failed: string[] = [];
for (const [i, r] of queue.entries()) {
  if (i > 0) {
    const { promise, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, 1000 + Math.random() * 2000);
    await promise;
  }
  const label = `[${i + 1}/${queue.length}] ${r.email} (${r.type}, ${r.sheets.length} sheet(s))`;
  let error: string | null = null;
  let smtpReply = "";
  try {
    const pdfs: Uint8Array[] = [];
    for (const s of r.sheets) pdfs.push(await renderRemarksSheet(assets, s));
    const bytes = pdfs.reduce((n, pdf) => n + pdf.length, 0);
    if (bytes > MAX_ATTACHMENT_BYTES) throw new Error(`attachments are ${(bytes / 2 ** 20).toFixed(1)} MB, over 20 MB`);
    const { subject, html } = buildRemarksEmail({
      type: r.type, registrantName: r.name, eventTitle: eventRes.data!.title,
      sheets: r.sheets.map((s) => ({ participant: s.name, category: s.category })),
    });
    const info = await mailer.sendMail({
      from: `Musica Lumina <${env.SMTP_USERNAME}>`, to: testTo ?? r.email, replyTo: REPLY_TO, subject, html,
      attachments: r.sheets.map((s, j) => ({
        filename: `${s.name} - ${s.category}.pdf`.replace(/[\\/:*?"<>|]/g, ""),
        content: Buffer.from(pdfs[j]),
        contentType: "application/pdf",
      })),
    });
    smtpReply = `${info.response} accepted=${info.accepted.join(",")} rejected=${info.rejected.join(",")}`;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const { error: logError } = await db.from("remarks_sheet_sends").insert({
    event_id: EVENT_ID,
    registrant_email: r.email,
    registrant_type: r.type,
    registration_ids: r.sheets.map((s) => s.registrationId),
    is_test: testTo !== null,
    is_resend: testTo === null && r.sentAt !== null,
    sent_to: testTo ?? r.email,
    error: error?.slice(0, 500) ?? null,
  });
  if (error) {
    failed.push(`${r.email} (${r.type}): ${error}`);
    console.log(`${label} FAILED: ${error}`);
  } else {
    sent++;
    console.log(`${label} sent: ${smtpReply}${logError ? ` (but could not log it: ${logError.message})` : ""}`);
  }
}
mailer.close();
console.log(`\nDone: ${sent} sent, ${failed.length} failed.`);
for (const f of failed) console.log(`  ${f}`);
