import { escapeHtml } from "../_shared/guard.ts";

export type RegistrantType = "teacher" | "parents" | "personal";

export interface AttachedSheet {
  participant: string;
  category: string;
}

/**
 * Wording per registrant type, ported from the LSPF 2026 jury comment sheet
 * emails (musicalumina-tools/scripts/email-templates/comment-sheets-*.html).
 */
const COPY: Record<RegistrantType, { badge: string; thanks: string; attached: string; note: string; closing: string }> = {
  teacher: {
    badge: "Jury Comment Sheets",
    thanks:
      "It was our genuine privilege to host your student(s) — their dedication, artistry, and courage on stage made this festival truly special.",
    attached:
      "Attached to this email, you will find the <strong>jury comment sheets</strong> for each of your registered students. We hope the feedback from our esteemed jury serves as meaningful encouragement on each musician's continued journey.",
    note:
      "<strong>Kindly forward</strong> each student's comment sheet to them (and their parents, where applicable). We trust you to distribute these with the context they deserve.",
    closing: "We look forward to welcoming you and your students to future editions of Musica Lumina.",
  },
  parents: {
    badge: "Jury Comment Sheets",
    thanks:
      "It was our genuine privilege to host your child — their dedication, artistry, and courage on stage made this festival truly special.",
    attached:
      "Attached to this email, you will find the <strong>jury comment sheet(s)</strong> for your registered child or children. We hope the feedback from our esteemed jury serves as meaningful encouragement on their continued musical journey.",
    note:
      "Please read through the comments with your child — we hope the jury's remarks become a gentle source of reflection and encouragement for their next stage.",
    closing: "We look forward to welcoming you and your family to future editions of Musica Lumina.",
  },
  personal: {
    badge: "Jury Comment Sheet",
    thanks:
      "Your dedication, artistry, and courage on stage made this festival truly special, and we are grateful to have shared the moment with you.",
    attached:
      "Attached to this email, you will find your <strong>jury comment sheet(s)</strong>. We hope the feedback from our esteemed jury serves as meaningful encouragement on your continued musical journey.",
    note:
      "Read through the comments at your own pace — we hope the jury's remarks serve as a gentle source of reflection and encouragement for your next stage.",
    closing: "We look forward to welcoming you to future editions of Musica Lumina.",
  },
};

const P = "margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#444;";

export function buildRemarksEmail(input: {
  type: RegistrantType;
  registrantName: string;
  eventTitle: string;
  sheets: AttachedSheet[];
}) {
  const { type, registrantName, eventTitle, sheets } = input;
  const copy = COPY[type];
  const event = escapeHtml(eventTitle);
  const opening = type === "personal"
    ? `Thank you for performing at the <strong>${event}</strong>.`
    : `Thank you for being part of the <strong>${event}</strong>.`;
  const sheetRows = sheets
    .map(
      (s) =>
        `<p style="margin:0 0 6px 0;font-size:14px;color:#444;">&#9834;&nbsp; <strong>${escapeHtml(s.participant)}</strong> <span style="color:#777;">· ${escapeHtml(s.category)}</span></p>`,
    )
    .join("");

  const subject = `${eventTitle} – ${copy.badge}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#FFFBEF;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#2d2d2d;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEF;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(73,24,34,0.10);">
          <tr>
            <td style="background:#491822;background:linear-gradient(135deg,#491822 0%,#6b2432 100%);padding:40px 48px;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.7);">Musica Lumina Presents</p>
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;line-height:1.3;">${event}</h1>
              <p style="margin:14px 0 0 0;font-size:14px;color:#E2A225;letter-spacing:1px;">${copy.badge}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 48px;">
              <p style="margin:0 0 20px 0;font-size:16px;line-height:1.6;">Dear <strong>${escapeHtml(registrantName)}</strong>,</p>
              <p style="${P}">${opening} ${copy.thanks}</p>
              <p style="${P}margin-bottom:28px;">${copy.attached}</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEF;border-left:4px solid #491822;border-radius:0 8px 8px 0;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px 0;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#491822;">What's Attached</p>
                    ${sheetRows}
                    <p style="margin:12px 0 0 0;font-size:13px;color:#777;line-height:1.7;">One PDF per participant and category, named after the participant and category.</p>
                  </td>
                </tr>
              </table>
              <p style="${P}margin-bottom:28px;">${copy.note}</p>
              <p style="${P}margin-bottom:32px;">Thank you again for entrusting us with this moment. ${copy.closing}</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
                <tr>
                  <td style="background:#FFFBEF;border-radius:8px;padding:20px 24px;text-align:center;">
                    <p style="margin:0 0 6px 0;font-size:13px;color:#888;">Questions? Reach us anytime.</p>
                    <p style="margin:0;font-size:14px;">
                      <a href="https://www.instagram.com/musicalumina" style="color:#491822;text-decoration:none;margin:0 10px;">Instagram</a> ·
                      <a href="mailto:contact@musicalumina.com" style="color:#491822;text-decoration:none;margin:0 10px;">Email</a> ·
                      <a href="https://wa.me/628211720765" style="color:#491822;text-decoration:none;margin:0 10px;">WhatsApp</a>
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:15px;line-height:1.8;">Warm regards,<br/><strong>Musica Lumina Team</strong></p>
            </td>
          </tr>
          <tr>
            <td style="background:#F9F3E2;padding:20px 48px;text-align:center;border-top:1px solid #EDE3CC;">
              <p style="margin:0;font-size:12px;color:#9a8a6d;line-height:1.6;">
                © ${new Date().getFullYear()} Musica Lumina · ${event}<br/>
                Jury comment sheets are intended for the recipient's personal review — please handle them with care.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return { subject, html };
}
