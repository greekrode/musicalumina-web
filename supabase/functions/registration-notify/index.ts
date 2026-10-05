import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, signN8nJwt, withCors } from "../_shared/n8n.ts";
import { verifyTurnstile } from "../_shared/guard.ts";
import { buildRegistrationEmail, type RegistrationKind } from "../_shared/registration-email.ts";

/**
 * registration-notify — sends the confirmation email and the Lark mirror for
 * a registration the visitor just submitted.
 *
 *   { registrationId, language: "en" | "id", turnstileToken }
 *
 * The browser no longer chooses recipients or content. Everything is read
 * from the database: the email goes only to the registration's own address,
 * the Lark row is built from the stored registration, and both happen at
 * most once (registrations.email_sent_at is claimed atomically), only within
 * 30 minutes of registering, and only with a valid Turnstile token.
 * Replaces the open email-send / whatsapp-send / lark-send relays.
 */
const db = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);
const WINDOW_MS = 30 * 60 * 1000;
const N8N = "https://hooks.kangritel.com/webhook";

const first = <T>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
const capitalize = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

async function postN8n(path: string, body: unknown) {
  const token = await signN8nJwt();
  const res = await fetch(`${N8N}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
}

serve(
  withCors(async (req) => {
    const { registrationId, language, turnstileToken } = await req.json().catch(() => ({}));
    if (!/^[0-9a-f-]{36}$/i.test(String(registrationId))) return jsonResponse({ error: "Invalid request" }, 400);
    const lang = language === "id" ? "id" : "en";

    if (!(await verifyTurnstile(req, turnstileToken, "register"))) {
      return jsonResponse({ error: "Verification failed. Please refresh and try again." }, 403);
    }

    const { data: reg, error } = await db
      .from("registrations")
      .select(`
        id, created_at, email_sent_at, ref_code, registrant_status, registrant_name,
        registrant_email, registrant_whatsapp, participant_name, participant_age,
        song_title, song_duration, birth_certificate_url, song_pdf_url, video_url,
        bank_name, bank_account_name, bank_account_number, payment_receipt_url,
        events ( id, title, type, lark_base, lark_table ),
        event_categories ( name ),
        event_subcategories ( name ),
        registration_participants ( slot, participant_name ),
        masterclass_participants ( session_date, preferred_start_at, number_of_slots, duration, repertoire, is_hold )
      `)
      .eq("id", registrationId)
      .maybeSingle();
    if (error) throw error;
    if (!reg || Date.now() - new Date(reg.created_at).getTime() > WINDOW_MS) {
      return jsonResponse({ error: "Registration not found or too old" }, 404);
    }

    // At most once per registration, even under concurrent calls.
    const { data: claimed } = await db
      .from("registrations")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", reg.id)
      .is("email_sent_at", null)
      .select("id");
    if (!claimed?.length) return jsonResponse({ ok: true, alreadySent: true });

    const event = first(reg.events)!;
    const kind: RegistrationKind =
      event.type === "masterclass" ? "masterclass" : event.type === "group_class" ? "group_class" : "competition";
    const category = first(reg.event_categories)?.name ?? "";
    const subCategory = first(reg.event_subcategories)?.name ?? "";
    const performers = [...(reg.registration_participants ?? [])]
      .sort((a, b) => a.slot - b.slot)
      .map((p) => p.participant_name);
    const sessions = [...(reg.masterclass_participants ?? [])]
      .filter((s) => !s.is_hold)
      .sort((a, b) => String(a.preferred_start_at).localeCompare(String(b.preferred_start_at)));
    const repertoire: string[] = Array.isArray(sessions[0]?.repertoire) ? sessions[0].repertoire.map(String) : [];
    const slots = sessions.reduce((n, s) => n + (s.number_of_slots ?? 0), 0);
    const sessionLines = sessions.map((s) => {
      const time = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })
        .format(new Date(s.preferred_start_at));
      return `${time} WIB · ${s.number_of_slots} slot(s)`;
    });

    const results: Record<string, string> = {};

    try {
      const { subject, html } = buildRegistrationEmail(kind, {
        registrant_status: reg.registrant_status ?? undefined,
        registrant_name: (reg.registrant_name || reg.participant_name || "").trim(),
        registrant_email: reg.registrant_email,
        participant_name: reg.participant_name ?? "",
        participant_names: performers.length ? performers : undefined,
        participant_age: reg.participant_age ?? undefined,
        song_title: reg.song_title ?? undefined,
        song_duration: reg.song_duration ?? undefined,
        category,
        sub_category: subCategory,
        registration_ref_code: reg.ref_code ?? "",
        number_of_slots: slots || null,
        repertoire,
        selected_date: sessions[0]?.preferred_start_at ?? null,
        session_lines: sessionLines,
        duration: sessions[0]?.duration ?? null,
        event_name: event.title,
        language: lang,
      });
      await postN8n("send-email", { email: reg.registrant_email, subject, message: html });
      results.email = "sent";
    } catch (e) {
      console.error("registration-notify email failed", reg.id, e);
      results.email = "failed";
    }

    if (event.lark_base && event.lark_table) {
      try {
        const fields: Record<string, unknown> = {
          "Registration Reference Code": reg.ref_code,
          "Registrant Name": reg.registrant_name || reg.participant_name,
          "Registrant Email": reg.registrant_email,
          "Registrant Whatsapp": String(reg.registrant_whatsapp ?? "").replace(/^\+/, ""),
          "Participant's Name": reg.participant_name,
          "Bank Name": reg.bank_name,
          "Bank Account Name": reg.bank_account_name,
          "Bank Account Number": reg.bank_account_number,
          "Payment Receipt": {
            link: reg.payment_receipt_url,
            text: `${reg.registrant_name || reg.participant_name} - ${new Date(reg.created_at).toLocaleDateString("en-US")}`,
          },
        };
        if (reg.registrant_status && kind !== "group_class") fields["Registrant"] = capitalize(reg.registrant_status);
        if (reg.birth_certificate_url) fields["Birth Cert / Passport"] = { link: reg.birth_certificate_url, text: reg.participant_name };
        const pdfs: string[] = Array.isArray(reg.song_pdf_url) ? reg.song_pdf_url : [];
        if (pdfs.length) fields["Song PDF"] = kind === "masterclass" ? pdfs.join(", ") : { link: pdfs[0], text: reg.song_title };
        if (reg.video_url) fields["Video URL"] = { link: reg.video_url, text: `${reg.participant_name} - ${reg.song_title}` };
        if (reg.song_duration) fields["Song Duration"] = reg.song_duration;
        if (reg.song_title) fields["Song Title"] = reg.song_title;
        if (category) { fields["Category"] = category; fields["Sub Category"] = subCategory; }
        if (reg.participant_age) fields["Participant's Age"] = reg.participant_age;
        if (slots) fields["Slots"] = slots;
        if (repertoire.length) fields["Repertoires"] = repertoire.join("; ");
        if (sessions[0]?.preferred_start_at) fields["Selected Date"] = new Date(sessions[0].preferred_start_at).getTime();
        if (sessions[0]?.duration) fields["Duration"] = sessions[0].duration;

        await postN8n("send-to-lark", {
          data: { event: { id: event.id, lark_base: event.lark_base, lark_table: event.lark_table, type: event.type }, formData: { fields } },
        });
        results.lark = "sent";
      } catch (e) {
        console.error("registration-notify lark failed", reg.id, e);
        results.lark = "failed";
      }
    }

    return jsonResponse({ ok: true, ...results });
  }),
);
