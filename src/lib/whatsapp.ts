import * as jose from "jose";

// Helper function to format date for WhatsApp display
function formatDateForWhatsApp(dateString: string): string {
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

interface WhatsAppMessageData {
  registrant_status?: string;
  registrant_name: string;
  registrant_email?: string;
  registrant_whatsapp: string;
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

export class WhatsAppService {
  private static readonly WEBHOOK_URL =
    "https://n8n.kangritel.com/webhook/send-whatsapp-message";

  private static async generateAuthToken(): Promise<string> {
    const secret = import.meta.env.VITE_JWT_SECRET;
    if (!secret) {
      throw new Error("WhatsApp JWT secret is not configured");
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

  private static formatCompetitionMessage(data: WhatsAppMessageData): string {
    const registrantType =
      {
        personal: data.language === "id" ? "Personal" : "Personal",
        parents: data.language === "id" ? "Orang Tua" : "Parents",
        teacher: data.language === "id" ? "Guru" : "Teacher",
      }[data.registrant_status || ""] || data.registrant_status;

    // Format message with WhatsApp markdown
    return data.language === "id"
      ? `*Pendaftaran ${data.event_name} Berhasil!* 🎉\n\n` +
          `Halo *${data.registrant_name}*,\n\n` +
          `Terima kasih telah mendaftar untuk ${data.event_name}. Berikut adalah detail pendaftaran Anda:\n\n` +
          `*Nomor Referensi:* ${data.registration_ref_code}\n\n` +
          `*Status Pendaftar:* ${registrantType}\n` +
          `*Nama Peserta:* ${data.participant_name}\n` +
          `*Kategori:* ${data.category}\n` +
          `*Sub Kategori:* ${data.sub_category}\n` +
          `*Lagu:* ${data.song_title}\n` +
          (data.song_duration ? `*Durasi:* ${data.song_duration}\n` : "") +
          `\nKami akan segera memproses pendaftaran Anda. Silakan simpan nomor referensi di atas untuk keperluan di masa mendatang.\n\n` +
          `Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.\n\n` +
          `Salam musik,\n` +
          `Tim Musical Lumina`
      : `*${data.event_name} Registration Successful!* 🎉\n\n` +
          `Hello *${data.registrant_name}*,\n\n` +
          `Thank you for registering for ${data.event_name}. Here are your registration details:\n\n` +
          `*Reference Number:* ${data.registration_ref_code}\n\n` +
          `*Registrant Status:* ${registrantType}\n` +
          `*Participant Name:* ${data.participant_name}\n` +
          `*Category:* ${data.category}\n` +
          `*Sub Category:* ${data.sub_category}\n` +
          `*Song:* ${data.song_title}\n` +
          (data.song_duration ? `*Duration:* ${data.song_duration}\n` : "") +
          `\nWe will process your registration shortly. Please keep the reference number for future correspondence.\n\n` +
          `If you have any questions, please don't hesitate to contact us.\n\n` +
          `Musical regards,\n` +
          `Musical Lumina Team`;
  }

  private static formatGroupClassMessage(data: WhatsAppMessageData): string {
    return data.language === "id"
      ? `*Pendaftaran ${data.event_name} Berhasil!* 🎉\n\n` +
          `Halo *${data.registrant_name}*,\n\n` +
          `Terima kasih telah mendaftar untuk ${data.event_name}. Berikut adalah detail pendaftaran Anda:\n\n` +
          `*Nomor Referensi:* ${data.registration_ref_code}\n\n` +
          `*Nama Peserta:* ${data.participant_name}\n\n` +
          `*Umur Peserta:* ${data.participant_age}\n\n` +
          `\nKami akan segera memproses pendaftaran Anda. Silakan simpan nomor referensi di atas untuk keperluan di masa mendatang.\n\n` +
          `Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.\n\n` +
          `Salam musik,\n` +
          `Tim Musical Lumina`
      : `*${data.event_name} Registration Successful!* 🎉\n\n` +
          `Hello *${data.registrant_name}*,\n\n` +
          `Thank you for registering for ${data.event_name}. Here are your registration details:\n\n` +
          `*Reference Number:* ${data.registration_ref_code}\n\n` +
          `*Participant Name:* ${data.participant_name}\n\n` +
          `*Age:* ${data.participant_age}\n\n` +
          `\nWe will process your registration shortly. Please keep the reference number for future correspondence.\n\n` +
          `If you have any questions, please don't hesitate to contact us.\n\n` +
          `Musical regards,\n` +
          `Musical Lumina Team`;
  }

  private static formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters and ensure it starts with country code
    return phone.replace(/^\+/, "");
  }

  public static async sendCompetitionRegistrationMessage(
    data: WhatsAppMessageData
  ): Promise<void> {
    try {
      const message = this.formatCompetitionMessage(data);
      const phone = this.formatPhoneNumber(data.registrant_whatsapp);
      const token = await this.generateAuthToken();

      const response = await fetch(this.WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to send WhatsApp message: ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("WhatsApp message sent successfully:", result);
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      throw error;
    }
  }

  public static async sendGroupClassRegistrationMessage(
    data: WhatsAppMessageData
  ): Promise<void> {
    try {
      const message = this.formatGroupClassMessage(data);
      const phone = this.formatPhoneNumber(data.registrant_whatsapp);
      const token = await this.generateAuthToken();

      const response = await fetch(this.WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to send WhatsApp message: ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("WhatsApp message sent successfully:", result);
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      throw error;
    }
  }

  public static async sendMasterclassRegistrationMessage(
    data: WhatsAppMessageData
  ): Promise<void> {
    try {
      const message = this.formatMasterclassMessage(data);
      const phone = this.formatPhoneNumber(data.registrant_whatsapp);
      const token = await this.generateAuthToken();

      const response = await fetch(this.WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to send WhatsApp message: ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("WhatsApp message sent successfully:", result);
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      throw error;
    }
  }

  private static formatMasterclassMessage(data: WhatsAppMessageData): string {
    return data.language === "id"
      ? `*Pendaftaran ${data.event_name} Berhasil!* 🎉\n\n` +
          `Halo *${data.registrant_name.trim()}*,\n\n` +
          `Terima kasih telah mendaftar untuk ${data.event_name}. Berikut adalah detail pendaftaran Anda:\n\n` +
          `*Nomor Referensi:* ${data.registration_ref_code}\n\n` +
          `*Nama Peserta:* ${data.participant_name}\n` +
          `*Umur Peserta:* ${data.participant_age}\n` +
          (data.selected_date
            ? `*Tanggal yang Dipilih:* ${formatDateForWhatsApp(
                data.selected_date
              )}\n`
            : "") +
          `*Jumlah Slot:* ${data.number_of_slots}\n` +
          `*Durasi dipilih:* ${data.duration} menit\n` +
          `*Repertoire:* ${
            data.repertoire?.join("\n") || "Tidak ada repertoar yang ditentukan"
          }\n` +
          `\nKami akan segera memproses pendaftaran Anda. Silakan simpan nomor referensi di atas untuk keperluan di masa mendatang.\n\n` +
          `Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.\n\n` +
          `Salam musik,\n` +
          `Tim Musical Lumina`
      : `*${data.event_name} Registration Successful!* 🎉\n\n` +
          `Hello *${data.registrant_name.trim()}*,\n\n` +
          `Thank you for registering for ${data.event_name}. Here are your registration details:\n\n` +
          `*Reference Number:* ${data.registration_ref_code}\n\n` +
          `*Participant Name:* ${data.participant_name}\n` +
          `*Age:* ${data.participant_age}\n` +
          (data.selected_date
            ? `*Selected Date:* ${formatDateForWhatsApp(data.selected_date)}\n`
            : "") +
          `*Number of Slots:* ${data.number_of_slots}\n` +
          `*Selected duration:* ${data.duration} minutes\n` +
          `*Repertoire:* ${
            data.repertoire?.join("\n") || "No repertoire specified"
          }\n` +
          `\nWe will process your registration shortly. Please keep the reference number for future correspondence.\n\n` +
          `If you have any questions, please don't hesitate to contact us.\n\n` +
          `Musical regards,\n` +
          `Musical Lumina Team`;
  }
}
