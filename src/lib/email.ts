import * as jose from "jose";

// Helper function to format date for email display
function formatDateForEmail(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const year = date.getFullYear();

  // Add ordinal suffix to day
  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return `${getOrdinal(day)} ${month} ${year}`;
}

interface EmailMessageData {
  registrant_status?: string;
  registrant_name: string;
  registrant_email: string;
  registrant_whatsapp?: string;
  participant_name: string;
  participant_age?: number;
  song_title?: string;
  song_duration?: string;
  category?: string;
  sub_category?: string;
  registration_ref_code: string;
  number_of_slots?: number | null;
  repertoire?: string[] | null;
  selected_date?: string | null;
  duration?: number | null;
  event_name: string;
  language: string;
}

export class EmailService {
  private static readonly WEBHOOK_URL =
    "https://n8n.kangritel.com/webhook/send-email";

  private static async generateAuthToken(): Promise<string> {
    const secret = import.meta.env.VITE_JWT_SECRET;
    if (!secret) {
      throw new Error("Email JWT secret is not configured");
    }

    const alg = "HS256";
    const secretBytes = new TextEncoder().encode(secret);

    const jwt = await new jose.SignJWT({
      iss: "musical-lumina",
    })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secretBytes);

    return jwt;
  }

  private static getEmailTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Musical Lumina Registration</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f4f7;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
    }
    .email-header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      font-weight: 600;
    }
    .email-header .emoji {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .email-body {
      padding: 40px 30px;
      color: #333333;
      line-height: 1.6;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
      color: #333333;
    }
    .intro-text {
      margin-bottom: 30px;
      color: #555555;
    }
    .details-box {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      border-radius: 6px;
      padding: 25px;
      margin: 25px 0;
    }
    .detail-row {
      display: flex;
      padding: 10px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #667eea;
      min-width: 160px;
      flex-shrink: 0;
    }
    .detail-value {
      color: #333333;
      flex: 1;
    }
    .reference-number {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      padding: 15px 20px;
      border-radius: 8px;
      text-align: center;
      margin: 25px 0;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 1px;
    }
    .reference-label {
      font-size: 12px;
      opacity: 0.9;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .footer-text {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e9ecef;
      color: #666666;
    }
    .signature {
      margin-top: 20px;
      font-style: italic;
      color: #667eea;
    }
    .email-footer {
      background-color: #2d3748;
      padding: 25px 30px;
      text-align: center;
      color: #a0aec0;
      font-size: 12px;
    }
    .repertoire-list {
      list-style: none;
      padding: 0;
      margin: 10px 0;
    }
    .repertoire-list li {
      padding: 8px 0;
      padding-left: 20px;
      position: relative;
    }
    .repertoire-list li:before {
      content: "♪";
      position: absolute;
      left: 0;
      color: #667eea;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    ${content}
    <div class="email-footer">
      <p>&copy; ${new Date().getFullYear()} Musical Lumina. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private static formatCompetitionMessage(data: EmailMessageData): string {
    const registrantType =
      {
        personal: data.language === "id" ? "Personal" : "Personal",
        parents: data.language === "id" ? "Orang Tua" : "Parents",
        teacher: data.language === "id" ? "Guru" : "Teacher",
      }[data.registrant_status || ""] || data.registrant_status;

    if (data.language === "id") {
      return this.getEmailTemplate(`
        <div class="email-header">
          <div class="emoji">🎉</div>
          <h1>Pendaftaran ${data.event_name} Berhasil!</h1>
        </div>
        <div class="email-body">
          <p class="greeting">Halo <strong>${data.registrant_name}</strong>,</p>
          <p class="intro-text">
            Terima kasih telah mendaftar untuk ${data.event_name}. Berikut adalah detail pendaftaran Anda:
          </p>

          <div class="reference-number">
            <div class="reference-label">Nomor Referensi</div>
            <div>${data.registration_ref_code}</div>
          </div>

          <div class="details-box">
            <div class="detail-row">
              <div class="detail-label">Status Pendaftar:</div>
              <div class="detail-value">${registrantType}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Nama Peserta:</div>
              <div class="detail-value">${data.participant_name}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Kategori:</div>
              <div class="detail-value">${data.category}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Sub Kategori:</div>
              <div class="detail-value">${data.sub_category}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Lagu:</div>
              <div class="detail-value">${data.song_title}</div>
            </div>
            ${
              data.song_duration
                ? `
            <div class="detail-row">
              <div class="detail-label">Durasi:</div>
              <div class="detail-value">${data.song_duration}</div>
            </div>
            `
                : ""
            }
          </div>

          <div class="footer-text">
            <p>Kami akan segera memproses pendaftaran Anda. Silakan simpan nomor referensi di atas untuk keperluan di masa mendatang.</p>
            <p>Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.</p>
            <p class="signature">Salam musik,<br>Tim Musical Lumina</p>
          </div>
        </div>
      `);
    } else {
      return this.getEmailTemplate(`
        <div class="email-header">
          <div class="emoji">🎉</div>
          <h1>${data.event_name} Registration Successful!</h1>
        </div>
        <div class="email-body">
          <p class="greeting">Hello <strong>${data.registrant_name}</strong>,</p>
          <p class="intro-text">
            Thank you for registering for ${data.event_name}. Here are your registration details:
          </p>

          <div class="reference-number">
            <div class="reference-label">Reference Number</div>
            <div>${data.registration_ref_code}</div>
          </div>

          <div class="details-box">
            <div class="detail-row">
              <div class="detail-label">Registrant Status:</div>
              <div class="detail-value">${registrantType}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Participant Name:</div>
              <div class="detail-value">${data.participant_name}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Category:</div>
              <div class="detail-value">${data.category}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Sub Category:</div>
              <div class="detail-value">${data.sub_category}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Song:</div>
              <div class="detail-value">${data.song_title}</div>
            </div>
            ${
              data.song_duration
                ? `
            <div class="detail-row">
              <div class="detail-label">Duration:</div>
              <div class="detail-value">${data.song_duration}</div>
            </div>
            `
                : ""
            }
          </div>

          <div class="footer-text">
            <p>We will process your registration shortly. Please keep the reference number for future correspondence.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p class="signature">Musical regards,<br>Musical Lumina Team</p>
          </div>
        </div>
      `);
    }
  }

  private static formatGroupClassMessage(data: EmailMessageData): string {
    if (data.language === "id") {
      return this.getEmailTemplate(`
        <div class="email-header">
          <div class="emoji">🎉</div>
          <h1>Pendaftaran ${data.event_name} Berhasil!</h1>
        </div>
        <div class="email-body">
          <p class="greeting">Halo <strong>${data.registrant_name}</strong>,</p>
          <p class="intro-text">
            Terima kasih telah mendaftar untuk ${data.event_name}. Berikut adalah detail pendaftaran Anda:
          </p>

          <div class="reference-number">
            <div class="reference-label">Nomor Referensi</div>
            <div>${data.registration_ref_code}</div>
          </div>

          <div class="details-box">
            <div class="detail-row">
              <div class="detail-label">Nama Peserta:</div>
              <div class="detail-value">${data.participant_name}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Umur Peserta:</div>
              <div class="detail-value">${data.participant_age}</div>
            </div>
          </div>

          <div class="footer-text">
            <p>Kami akan segera memproses pendaftaran Anda. Silakan simpan nomor referensi di atas untuk keperluan di masa mendatang.</p>
            <p>Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.</p>
            <p class="signature">Salam musik,<br>Tim Musical Lumina</p>
          </div>
        </div>
      `);
    } else {
      return this.getEmailTemplate(`
        <div class="email-header">
          <div class="emoji">🎉</div>
          <h1>${data.event_name} Registration Successful!</h1>
        </div>
        <div class="email-body">
          <p class="greeting">Hello <strong>${data.registrant_name}</strong>,</p>
          <p class="intro-text">
            Thank you for registering for ${data.event_name}. Here are your registration details:
          </p>

          <div class="reference-number">
            <div class="reference-label">Reference Number</div>
            <div>${data.registration_ref_code}</div>
          </div>

          <div class="details-box">
            <div class="detail-row">
              <div class="detail-label">Participant Name:</div>
              <div class="detail-value">${data.participant_name}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Age:</div>
              <div class="detail-value">${data.participant_age}</div>
            </div>
          </div>

          <div class="footer-text">
            <p>We will process your registration shortly. Please keep the reference number for future correspondence.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p class="signature">Musical regards,<br>Musical Lumina Team</p>
          </div>
        </div>
      `);
    }
  }

  private static formatMasterclassMessage(data: EmailMessageData): string {
    const repertoireHtml = data.repertoire?.length
      ? `
      <ul class="repertoire-list">
        ${data.repertoire.map((piece) => `<li>${piece}</li>`).join("")}
      </ul>
    `
      : data.language === "id"
      ? "Tidak ada repertoar yang ditentukan"
      : "No repertoire specified";

    if (data.language === "id") {
      return this.getEmailTemplate(`
        <div class="email-header">
          <div class="emoji">🎉</div>
          <h1>Pendaftaran ${data.event_name} Berhasil!</h1>
        </div>
        <div class="email-body">
          <p class="greeting">Halo <strong>${data.registrant_name.trim()}</strong>,</p>
          <p class="intro-text">
            Terima kasih telah mendaftar untuk ${data.event_name}. Berikut adalah detail pendaftaran Anda:
          </p>

          <div class="reference-number">
            <div class="reference-label">Nomor Referensi</div>
            <div>${data.registration_ref_code}</div>
          </div>

          <div class="details-box">
            <div class="detail-row">
              <div class="detail-label">Nama Peserta:</div>
              <div class="detail-value">${data.participant_name}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Umur Peserta:</div>
              <div class="detail-value">${data.participant_age}</div>
            </div>
            ${
              data.selected_date
                ? `
            <div class="detail-row">
              <div class="detail-label">Tanggal yang Dipilih:</div>
              <div class="detail-value">${formatDateForEmail(data.selected_date)}</div>
            </div>
            `
                : ""
            }
            <div class="detail-row">
              <div class="detail-label">Jumlah Slot:</div>
              <div class="detail-value">${data.number_of_slots}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Durasi dipilih:</div>
              <div class="detail-value">${data.duration} menit</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Repertoire:</div>
              <div class="detail-value">${repertoireHtml}</div>
            </div>
          </div>

          <div class="footer-text">
            <p>Kami akan segera memproses pendaftaran Anda. Silakan simpan nomor referensi di atas untuk keperluan di masa mendatang.</p>
            <p>Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.</p>
            <p class="signature">Salam musik,<br>Tim Musical Lumina</p>
          </div>
        </div>
      `);
    } else {
      return this.getEmailTemplate(`
        <div class="email-header">
          <div class="emoji">🎉</div>
          <h1>${data.event_name} Registration Successful!</h1>
        </div>
        <div class="email-body">
          <p class="greeting">Hello <strong>${data.registrant_name.trim()}</strong>,</p>
          <p class="intro-text">
            Thank you for registering for ${data.event_name}. Here are your registration details:
          </p>

          <div class="reference-number">
            <div class="reference-label">Reference Number</div>
            <div>${data.registration_ref_code}</div>
          </div>

          <div class="details-box">
            <div class="detail-row">
              <div class="detail-label">Participant Name:</div>
              <div class="detail-value">${data.participant_name}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Age:</div>
              <div class="detail-value">${data.participant_age}</div>
            </div>
            ${
              data.selected_date
                ? `
            <div class="detail-row">
              <div class="detail-label">Selected Date:</div>
              <div class="detail-value">${formatDateForEmail(data.selected_date)}</div>
            </div>
            `
                : ""
            }
            <div class="detail-row">
              <div class="detail-label">Number of Slots:</div>
              <div class="detail-value">${data.number_of_slots}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Selected duration:</div>
              <div class="detail-value">${data.duration} minutes</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Repertoire:</div>
              <div class="detail-value">${repertoireHtml}</div>
            </div>
          </div>

          <div class="footer-text">
            <p>We will process your registration shortly. Please keep the reference number for future correspondence.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p class="signature">Musical regards,<br>Musical Lumina Team</p>
          </div>
        </div>
      `);
    }
  }

  public static async sendCompetitionRegistrationEmail(
    data: EmailMessageData
  ): Promise<void> {
    try {
      const message = this.formatCompetitionMessage(data);
      const token = await this.generateAuthToken();
      const subject =
        data.language === "id"
          ? `Pendaftaran ${data.event_name} Berhasil! 🎉`
          : `${data.event_name} Registration Successful! 🎉`;

      const response = await fetch(this.WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: data.registrant_email,
          subject,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send email: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Email sent successfully:", result);
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }

  public static async sendGroupClassRegistrationEmail(
    data: EmailMessageData
  ): Promise<void> {
    try {
      const message = this.formatGroupClassMessage(data);
      const token = await this.generateAuthToken();
      const subject =
        data.language === "id"
          ? `Pendaftaran ${data.event_name} Berhasil! 🎉`
          : `${data.event_name} Registration Successful! 🎉`;

      const response = await fetch(this.WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: data.registrant_email,
          subject,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send email: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Email sent successfully:", result);
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }

  public static async sendMasterclassRegistrationEmail(
    data: EmailMessageData
  ): Promise<void> {
    try {
      const message = this.formatMasterclassMessage(data);
      const token = await this.generateAuthToken();
      const subject =
        data.language === "id"
          ? `Pendaftaran ${data.event_name} Berhasil! 🎉`
          : `${data.event_name} Registration Successful! 🎉`;

      const response = await fetch(this.WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: data.registrant_email,
          subject,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send email: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Email sent successfully:", result);
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }
}
