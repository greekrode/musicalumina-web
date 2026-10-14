import { escapeHtml } from "../_shared/guard.ts";

export type RegistrantType = "teacher" | "parents" | "personal";

export interface AttachedSheet {
  participant: string;
  category: string;
}

/**
 * Wording per registrant type (registrations.registrant_status): teachers
 * hear about their students, parents about their child, personal
 * registrants about themselves. `thanks` receives the escaped event title.
 */
const COPY: Record<
  RegistrantType,
  { badge: string; thanks: (event: string) => string; attached: string; note: string; closing: string }
> = {
  teacher: {
    badge: "Jury Comment Sheets",
    thanks: (event) =>
      `Thank you for bringing your students to the ${event}. We loved hearing them play, and we hope they enjoyed the stage as much as we enjoyed listening.`,
    attached:
      "Each student's jury comment sheet is attached to this email as a PDF, with notes from both judges. Students who played in more than one category have a sheet for each.",
    note:
      "Please pass each sheet on to the student, and to their parents if that suits. The judges wrote the comments for the students themselves, so they're worth reading together after a lesson.",
    closing: "We hope to see you and your students again at our next festival.",
  },
  parents: {
    badge: "Jury Comment Sheets",
    thanks: (event) =>
      `Thank you for being part of the ${event}. It was lovely to hear your child play.`,
    attached:
      "Your child's jury comment sheet is attached to this email as a PDF, with notes from both judges. If they played in more than one category, there's a sheet for each.",
    note:
      "Try reading the comments together. The judges point out what went well, not only what to practise next, and kids usually like hearing both.",
    closing: "We hope to see your family again at our next festival.",
  },
  personal: {
    badge: "Jury Comment Sheet",
    thanks: (event) =>
      `Thank you for performing at the ${event}. We really enjoyed your performance.`,
    attached:
      "Your jury comment sheet is attached to this email as a PDF, with notes from both judges. If you played in more than one category, there's a sheet for each.",
    note:
      "Take your time with the comments. The judges note what went well, not only what to work on next.",
    closing: "We hope to see you again at our next festival.",
  },
};

export function buildRemarksEmail(input: {
  type: RegistrantType;
  registrantName: string;
  eventTitle: string;
  sheets: AttachedSheet[];
}) {
  const { type, registrantName, eventTitle, sheets } = input;
  const copy = COPY[type];
  const event = escapeHtml(eventTitle);
  const thanks = copy.thanks(event);
  const sheetRows = sheets
    .map(
      (s) =>
        `<tr><td valign="top" style="padding:0 10px 6px 0;color:#b07d12;">&#9834;</td><td style="padding:0 0 6px 0;"><span style="color:#491822;font-weight:bold;">${escapeHtml(s.participant)}</span> <span style="color:#6b5d58;">· ${escapeHtml(s.category)}</span></td></tr>`,
    )
    .join("");

  const subject = `${eventTitle} – ${copy.badge}`;
  // Layout and palette follow the LSPF 2026 photo & video email
  // (musicalumina-tools/scripts/email-templates/lspf2026-photo-video.html).
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f1e7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f6f1e7;">${copy.badge} from the ${event}, attached to this email.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f6f1e7;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#fffbf2;border:1px solid #eadfca;">
        <tr>
          <td align="center" style="padding:32px 32px 24px 32px;border-bottom:1px solid #eadfca;">
            <img src="https://www.musicalumina.com/assets/ML-LogoColor-CYLi1NKy.png" alt="Musica Lumina" height="48" style="display:block;height:48px;width:auto;border:0;">
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 8px 40px;font-family:Georgia,'Times New Roman',serif;">
            <p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b07d12;">${event}</p>
            <h1 style="margin:0;font-size:30px;line-height:1.25;font-weight:normal;color:#491822;">${copy.badge}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 8px 40px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#3d3230;">
            <p style="margin:0 0 14px 0;">Dear ${escapeHtml(registrantName)},</p>
            <p style="margin:0 0 14px 0;">${thanks}</p>
            <p style="margin:0;">${copy.attached}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 8px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eadfca;background-color:#ffffff;">
              <tr>
                <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#3d3230;">
                  <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#b07d12;font-weight:bold;">What's Attached</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">${sheetRows}</table>
                  <p style="margin:8px 0 0 0;font-size:13px;color:#6b5d58;font-style:italic;">Each file is named after the participant and category.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 0 40px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#3d3230;">
            <p style="margin:0 0 14px 0;">${copy.note}</p>
            <p style="margin:0;">${copy.closing}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 36px 40px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#3d3230;">
            <p style="margin:0 0 20px 0;padding-top:24px;border-top:1px solid #eadfca;">For more info: contact us via <a href="https://wa.me/628211720765" target="_blank" style="color:#491822;font-weight:bold;">WhatsApp</a> or <a href="https://www.instagram.com/lspf.official" target="_blank" style="color:#491822;font-weight:bold;">Instagram</a>.</p>
            <p style="margin:0;">Warm regards,<br><span style="font-family:Georgia,'Times New Roman',serif;color:#491822;">Musica Lumina</span></p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 40px;background-color:#491822;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#e8d9c7;">
            You are receiving this email because you registered for the ${event}.<br>
            <a href="https://www.musicalumina.com" target="_blank" style="color:#e3a42a;text-decoration:none;">musicalumina.com</a>
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
