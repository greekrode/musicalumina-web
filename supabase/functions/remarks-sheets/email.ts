import { escapeHtml } from "../_shared/guard.ts";

export interface SheetLink {
  participant: string;
  category: string;
  song: string;
  url: string;
}

/**
 * Thank-you email carrying one download link per remarks sheet (one per
 * participant + category). Inline styles only: most mail clients drop <style>.
 */
export function buildRemarksEmail(input: { registrantName: string; eventTitle: string; sheets: SheetLink[] }) {
  const { registrantName, eventTitle, sheets } = input;
  const performers = [...new Set(sheets.map((s) => s.participant))];
  const performerText = performers.length === 1
    ? `<strong>${escapeHtml(performers[0])}</strong>`
    : `<strong>${performers.slice(0, -1).map(escapeHtml).join(", ")}</strong> and <strong>${escapeHtml(performers.at(-1))}</strong>`;

  const rows = sheets
    .map(
      (s) => `
        <tr>
          <td style="padding:16px 18px;border-top:1px solid #ece4d8;">
            <div style="font-size:16px;font-weight:600;color:#2b1d14;">${escapeHtml(s.participant)}</div>
            <div style="font-size:14px;color:#6b5a4c;margin-top:2px;">${escapeHtml(s.category)}</div>
            <div style="font-size:14px;color:#6b5a4c;font-style:italic;margin-top:2px;">${escapeHtml(s.song)}</div>
          </td>
          <td style="padding:16px 18px;border-top:1px solid #ece4d8;text-align:right;vertical-align:middle;white-space:nowrap;">
            <a href="${escapeHtml(s.url)}" style="display:inline-block;background:#7a1f2b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 16px;border-radius:6px;">Download PDF</a>
          </td>
        </tr>`,
    )
    .join("");

  const subject = `Adjudicator Remarks – ${eventTitle}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f6f1ea;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1ea;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#1d1b2e;padding:36px 32px;text-align:center;">
          <div style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#e9c46a;">Musica Lumina</div>
          <h1 style="margin:10px 0 0;font-size:26px;line-height:1.3;color:#ffffff;font-weight:600;">Thank you for performing with us!</h1>
          <div style="margin-top:8px;font-size:15px;color:#cfc8e6;">${escapeHtml(eventTitle)}</div>
        </td></tr>
        <tr><td style="padding:32px;color:#3b2f26;font-size:15px;line-height:1.7;">
          <p style="margin:0 0 16px;">Dear ${escapeHtml(registrantName)},</p>
          <p style="margin:0 0 16px;">Thank you for being part of the <strong>${escapeHtml(eventTitle)}</strong>. Congratulations to ${performerText} on a wonderful performance! Stepping onto the stage takes courage and dedication, and we were truly delighted to hear the music shared that day.</p>
          <p style="margin:0 0 20px;">Our adjudicators have written personal remarks for each performance. We hope their feedback brings encouragement and a few helpful ideas for the next step of the musical journey.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf8f3;border:1px solid #ece4d8;border-radius:8px;border-collapse:separate;">
            <tr><td colspan="2" style="padding:14px 18px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#7a1f2b;font-weight:600;">Adjudicator remarks</td></tr>
            ${rows}
          </table>
          <p style="margin:24px 0 16px;">Keep playing, keep exploring, and keep enjoying the music. We hope to see you again at our next festival!</p>
          <p style="margin:0;">Warm regards,<br><strong>The Musica Lumina Team</strong></p>
        </td></tr>
        <tr><td style="background:#fbf8f3;padding:20px 32px;text-align:center;font-size:12px;color:#8a7a6c;line-height:1.6;">
          @musicalumina · +62 821-1720-765 · contact@musicalumina.com
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, html };
}
