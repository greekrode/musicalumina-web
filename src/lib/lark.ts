import * as jose from 'jose';

interface LarkRegistrationData {
  event: {
    id: string;
    lark_base: string;
    lark_table: string;
  };
  registration: {
    ref_code: string;
    registrant_status: string;
    registrant_name: string;
    registrant_email: string;
    registrant_whatsapp: string;
    participant_name: string;
    category_name: string;
    subcategory_name: string;
    song_title: string;
    song_duration: string;
    birth_certificate_url: string;
    song_pdf_url: string | null;
    bank_name: string;
    bank_account_name: string;
    bank_account_number: string;
    payment_receipt_url: string;
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

    const alg = 'HS256';
    const secretBytes = new TextEncoder().encode(secret);

    const jwt = await new jose.SignJWT({
      iss: 'musical-lumina',
    })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime('1h')
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

    return {
      fields: {
        "Registration Reference Code": registration.ref_code,
        Registrant: registration.registrant_status,
        "Registrant Name": registration.registrant_name,
        "Registrant Email": registration.registrant_email,
        "Registrant Whatsapp": whatsappNumber,
        "Participant's Name": registration.participant_name,
        Category: registration.category_name,
        "Sub Category": registration.subcategory_name,
        "Song Title": registration.song_title,
        "Song Duration": registration.song_duration,
        "Birth Cert / Passport": {
          link: registration.birth_certificate_url,
          text: registration.participant_name,
        },
        "Song PDF": registration.song_pdf_url
          ? {
              link: registration.song_pdf_url,
              text: registration.song_title,
            }
          : null,
        "Bank Name": registration.bank_name,
        "Bank Account Name": registration.bank_account_name,
        "Bank Account Number": registration.bank_account_number,
        "Payment Receipt": {
          link: registration.payment_receipt_url,
          text: `${registration.registrant_name} - ${new Date(
            registration.created_at
          ).toLocaleDateString()}`,
        },
      },
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
