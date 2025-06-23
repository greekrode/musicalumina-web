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
    video_url?: string | null;
    bank_name: string;
    bank_account_name: string;
    bank_account_number: string;
    payment_receipt_url?: string | null;
    number_of_slots: number;
    repertoire: string;
    created_at: string;
  };
}

interface ParticipantData {
  participantName: string;
  category: string;
  subCategory: string;
  songTitle: string;
  hasVideoSubmitted: boolean;
  existingVideoUrl?: string;
  recordId: string;
}

interface LarkSearchResponse {
  code: number;
  data: {
    has_more: boolean;
    items: Array<{
      fields: {
        "Participant's Name": Array<{ text: string }>;
        Category: string;
        "Sub Category": string;
        "Song Title": Array<{ text: string }>;
        "Video URL"?: { link: string; text: string };
      };
      record_id: string;
    }>;
    total: number;
  };
  msg: string;
}

export class LarkService {
  private static readonly WEBHOOK_URL =
    "https://n8n.kangritel.com/webhook/send-to-lark";

  /**
   * Get Lark access token from n8n endpoint
   */
  public static async getAccessToken(): Promise<string> {
    try {
      const username = import.meta.env.VITE_N8N_USERNAME?.trim();
      const password = import.meta.env.VITE_N8N_PASSWORD?.trim();

      if (!username || !password) {
        throw new Error("N8N credentials are not configured");
      }

      const credentials = btoa(`${username}:${password}`);

      const response = await fetch(
        "https://n8n.kangritel.com/webhook/lark-access-token",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to get Lark access token: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.lark_access_token) {
        throw new Error("No lark_access_token in response");
      }

      return data.lark_access_token;
    } catch (error) {
      console.error("Error getting Lark access token:", error);
      throw error;
    }
  }

  /**
   * Search for participant data by registration reference code
   */
  public static async searchParticipantData(
    registrationRefCode: string
  ): Promise<ParticipantData> {
    try {
      const username = import.meta.env.VITE_N8N_USERNAME?.trim();
      const password = import.meta.env.VITE_N8N_PASSWORD?.trim();

      if (!username || !password) {
        throw new Error("N8N credentials are not configured");
      }

      const credentials = btoa(`${username}:${password}`);

      const response = await fetch(
        "https://n8n.kangritel.com/webhook/search-lark",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            base_id: "DPxNbSyPEa918OsuMJWlzy43gId",
            table_id: "tblh4z8siDb2qt50",
            view_id: "vewx2setSe",
            filter: {
              conjunction: "and",
              conditions: [
                {
                  field_name: "Registration Reference Code",
                  operator: "is",
                  value: [registrationRefCode],
                },
              ],
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to search participant data: ${response.statusText}`
        );
      }

      const data: LarkSearchResponse = await response.json();

      if (data.code !== 0) {
        throw new Error(`Lark API error: ${data.msg}`);
      }

      if (data.data.total === 0) {
        throw new Error("Invalid registration reference code");
      }

      const item = data.data.items[0];
      const fields = item.fields;

      // Debug logging
      console.log("Search response item:", item);
      console.log("Record ID from response:", item.record_id);

      return {
        participantName: fields["Participant's Name"]?.[0]?.text || "",
        category: fields["Category"] || "",
        subCategory: fields["Sub Category"] || "",
        songTitle: fields["Song Title"]?.[0]?.text || "",
        hasVideoSubmitted: !!fields["Video URL"],
        existingVideoUrl: fields["Video URL"]?.link,
        recordId: item.record_id,
      };
    } catch (error) {
      console.error("Error searching participant data:", error);
      throw error;
    }
  }

  /**
   * Update participant video URL in Lark
   */
  public static async updateParticipantVideo(
    recordId: string,
    videoUrl: string,
    participantName: string,
    category: string,
    subCategory: string
  ): Promise<void> {
    try {
      const username = import.meta.env.VITE_N8N_USERNAME?.trim();
      const password = import.meta.env.VITE_N8N_PASSWORD?.trim();

      if (!username || !password) {
        throw new Error("N8N credentials are not configured");
      }

      const credentials = btoa(`${username}:${password}`);

      const requestBody = {
        base_id: "DPxNbSyPEa918OsuMJWlzy43gId",
        table_id: "tblh4z8siDb2qt50",
        view_id: "vewx2setSe",
        record_id: recordId,
        fields: {
          "Video URL": {
            link: videoUrl,
            text: `${participantName} - ${category} - ${subCategory}`,
          },
        },
      };

      // Debug logging
      console.log("Update request body:", JSON.stringify(requestBody, null, 2));
      console.log("Record ID being sent:", recordId);

      const response = await fetch(
        "https://n8n.kangritel.com/webhook/update-lark-record",
        {
          method: "PUT",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to update participant video: ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("Video URL updated successfully:", data);
    } catch (error) {
      console.error("Error updating participant video:", error);
      throw error;
    }
  }

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

    if (registration.video_url) {
      fields["Video URL"] = {
        link: registration.video_url,
        text: `${registration.participant_name} - ${registration.song_title}`,
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

    if (registration.number_of_slots) {
      fields["Slots"] = registration.number_of_slots;
    }

    if (registration.repertoire) {
      fields["Repertoires"] = registration.repertoire;
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
