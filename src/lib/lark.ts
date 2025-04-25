import * as jose from "jose";

interface LarkRegistrationData {
  event: {
    id: string;
    lark_base: string;
    lark_table: string;
  };
  registration: {
    ref_code: string;
    registrant_status?: string | null;
    registrant_name: string;
    registrant_email: string;
    registrant_whatsapp: string;
    participant_name: string;
    participant_age?: number | null;
    category_name?: string | null;
    subcategory_name?: string | null;
    song_title?: string | null;
    song_duration?: string | null;
    birth_certificate_url?: string | null;
    song_pdf_url?: string | null;
    bank_name: string;
    bank_account_name: string;
    bank_account_number: string;
    payment_receipt_url?: string | null;
    created_at: string;
  };
}

export class LarkService {
  private static readonly WEBHOOK_URL =
    "https://n8n.kangritel.com/webhook/send-to-lark";

  private static async generateAuthToken(): Promise<string> {
    const secret = import.meta.env.VITE_JWT_SECRET;
    if (!secret) {
      throw new Error("Lark JWT secret is not configured");
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

  private static formatWhatsAppNumber(phone: string): string {
    return phone.replace(/^\+/, "");
  }

  private static formatLarkData(data: LarkRegistrationData): any {
    const { registration } = data;
    const whatsappNumber = this.formatWhatsAppNumber(
      registration.registrant_whatsapp
    );

    const fields: Record<string, unknown> = {
      "Registration Reference Code": registration.ref_code,
      "Registrant Name": registration.registrant_name,
      "Registrant Email": registration.registrant_email,
      "Registrant Whatsapp": whatsappNumber,
      "Participant's Name": registration.participant_name,
      "Bank Name": registration.bank_name,
      "Bank Account Name": registration.bank_account_name,
      "Bank Account Number": registration.bank_account_number,
      "Payment Receipt": {
        link: registration.payment_receipt_url,
        text: `${registration.registrant_name} - ${new Date(
          registration.created_at
        ).toLocaleDateString()}`,
      },
    };

    if (registration.registrant_status) {
      fields["Registrant"] = registration.registrant_status;
    }

    if (registration.birth_certificate_url) {
      fields["Birth Cert / Passport"] = {
        link: registration.birth_certificate_url,
        text: registration.participant_name,
      };
    }

    if (registration.song_pdf_url) {
      fields["Song PDF"] = {
        link: registration.song_pdf_url,
        text: registration.song_title,
      };
    }

    if (registration.song_duration) {
      fields["Song Duration"] = registration.song_duration;
    }

    if (registration.song_title) {
      fields["Song Title"] = registration.song_title;
    }

    if (registration.category_name) {
      fields["Category"] = registration.category_name;
      fields["Sub Category"] = registration.subcategory_name;
    }

    if (registration.participant_age) {
      fields["Participant's Age"] = registration.participant_age;
    }

    return {
      fields,
    };
  }

  public static async sendRegistrationData(
    data: LarkRegistrationData
  ): Promise<void> {
    try {
      const { event } = data;
      // Skip if no Lark configuration
      if (!event.lark_base || !event.lark_table) {
        console.log("No Lark configuration found, skipping...");
        return;
      }

      const formData = this.formatLarkData(data);
      const token = await this.generateAuthToken();

      const response = await fetch(this.WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: {
            event,
            formData,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send data to Lark: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Data sent to Lark successfully:", result);
    } catch (error) {
      console.error("Error sending data to Lark:", error);
      throw error;
    }
  }
}
