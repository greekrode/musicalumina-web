import { supabase } from "./supabase";

/**
 * LarkService — browser client for the Lark-bridge Edge Functions.
 *
 * Before: this file held `VITE_N8N_USERNAME` / `VITE_N8N_PASSWORD` /
 * `VITE_JWT_SECRET` and called `n8n.kangritel.com/webhook/…` directly.
 * Those values shipped in the client bundle and were readable by anyone
 * inspecting the site source, which effectively made the n8n → Lark
 * bridge an open write endpoint.
 *
 * After: every outbound call goes through a Supabase Edge Function in
 * `supabase/functions/lark-*`. The functions hold the credentials
 * server-side via Deno.env. Public API of this class is unchanged so
 * every call-site (RegistrationModal, VideoSubmissionPage, etc.) works
 * without edits.
 */

interface LarkRegistrationData {
  event: {
    id: string;
    lark_base: string;
    lark_table: string;
    type: string;
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
    song_pdf_url?: string[] | null;
    video_url?: string | null;
    bank_name: string;
    bank_account_name: string;
    bank_account_number: string;
    payment_receipt_url?: string | null;
    number_of_slots?: number | null;
    repertoire?: string | null;
    selected_date?: string | null;
    duration?: number | null;
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

/**
 * Invoke a Supabase Edge Function and return its JSON response. Throws
 * `Error` (not a raw FunctionsHttpError) so call sites can keep the
 * same try/catch shape they used when this class called `fetch` directly.
 */
async function invokeLarkFunction<T>(
  name: "lark-access-token" | "lark-search" | "lark-update" | "lark-send",
  body?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, {
    body: body ?? {},
  });
  if (error) {
    throw new Error(`${name} failed: ${error.message}`);
  }
  if (data === null || data === undefined) {
    throw new Error(`${name} returned empty response`);
  }
  return data;
}

export class LarkService {
  /**
   * Get a Lark access token via the `lark-access-token` Edge Function.
   * Kept for backward compatibility with any call sites that explicitly
   * request a token; the registration / video-submission flows never need
   * it directly.
   */
  public static async getAccessToken(): Promise<string> {
    try {
      const data = await invokeLarkFunction<{ lark_access_token?: string }>(
        "lark-access-token"
      );
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
   * Look up a registration in Lark by its reference code. Called from the
   * video-submission flow to confirm the participant before accepting a
   * video URL.
   */
  public static async searchParticipantData(
    registrationRefCode: string
  ): Promise<ParticipantData> {
    try {
      const data = await invokeLarkFunction<LarkSearchResponse>("lark-search", {
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
      });

      if (data.code !== 0) {
        throw new Error(`Lark API error: ${data.msg}`);
      }
      if (data.data.total === 0) {
        throw new Error("Invalid registration reference code");
      }

      const item = data.data.items[0];
      const fields = item.fields;

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

  /** Write back a video URL on an existing Lark record. */
  public static async updateParticipantVideo(
    recordId: string,
    videoUrl: string,
    participantName: string,
    category: string,
    subCategory: string
  ): Promise<void> {
    try {
      await invokeLarkFunction<unknown>("lark-update", {
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
      });
    } catch (error) {
      console.error("Error updating participant video:", error);
      throw error;
    }
  }

  /**
   * Mirror a new registration to Lark Base via the `lark-send` Edge
   * Function. The function signs a short-lived JWT on the server side —
   * the client doesn't hold the secret anymore.
   */
  public static async sendRegistrationData(
    data: LarkRegistrationData
  ): Promise<void> {
    try {
      const { event } = data;
      // Skip if no Lark configuration on the event
      if (!event.lark_base || !event.lark_table) {
        return;
      }

      const formData = LarkService.formatLarkData(data, event);
      await invokeLarkFunction<unknown>("lark-send", {
        data: {
          event,
          formData,
        },
      });
    } catch (error) {
      console.error("Error sending data to Lark:", error);
      throw error;
    }
  }

  private static formatWhatsAppNumber(phone: string): string {
    return phone.replace(/^\+/, "");
  }

  private static formatLarkData(
    data: LarkRegistrationData,
    event: { type: string }
  ): Record<string, unknown> {
    const { registration } = data;
    const whatsappNumber = LarkService.formatWhatsAppNumber(
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
      if (event.type === "masterclass") {
        // For masterclass with multiple PDFs, create comma-separated links
        fields["Song PDF"] = registration.song_pdf_url.join(", ");
      } else {
        // Single PDF (backward compatibility) — first element only
        fields["Song PDF"] = {
          link: registration.song_pdf_url[0],
          text: registration.song_title,
        };
      }
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

    if (registration.selected_date) {
      // Unix timestamp in milliseconds — Lark's expected date format.
      const epochTimestamp = new Date(registration.selected_date).getTime();
      fields["Selected Date"] = epochTimestamp;
    }

    if (registration.duration) {
      fields["Duration"] = registration.duration;
    }

    return { fields };
  }
}
