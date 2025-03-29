import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors";

const LARK_AUTH_URL = "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal";

// Read Lark credentials from environment variables
const APP_ID = Deno.env.get("LARK_APP_ID");
const APP_SECRET = Deno.env.get("LARK_APP_SECRET");

if (!APP_ID || !APP_SECRET) {
  throw new Error("Missing required Lark credentials in environment variables");
}

interface LarkAuthResponse {
  code: number;
  msg: string;
  tenant_access_token: string;
  expire: number;
}

interface RegistrationData {
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

async function getLarkAccessToken(): Promise<string> {
  const response = await fetch(LARK_AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: APP_ID,
      app_secret: APP_SECRET,
    }),
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to get Lark access token: ${response.statusText}`);
  }

  const data = (await response.json()) as LarkAuthResponse;
  if (data.code !== 0) {
    throw new Error(`Lark auth error: ${data.msg}`);
  }

  return data.tenant_access_token;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { data } = await req.json() as { data: RegistrationData };
    const { event, registration } = data;

    // Skip if no Lark configuration
    if (!event.lark_base || !event.lark_table) {
      return new Response(
        JSON.stringify({ success: true, message: "No Lark configuration found" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Get Lark access token
    const accessToken = await getLarkAccessToken();

    // Format WhatsApp number (remove +)
    const whatsappNumber = registration.registrant_whatsapp.replace("+", "");

    // Prepare Lark form data
    const larkFormData = {
      fields: {
        "Registration Reference Code": registration.ref_code,
        "Registrant": registration.registrant_status,
        "Registrant Name": registration.registrant_name,
        "Registrant Email": registration.registrant_email,
        "Registrant Whatsapp": whatsappNumber,
        "Participant's Name": registration.participant_name,
        "Category": registration.category_name,
        "Sub Category": registration.subcategory_name,
        "Song Title": registration.song_title,
        "Song Duration": registration.song_duration,
        "Birth Cert / Passport": {
          link: registration.birth_certificate_url,
          text: registration.participant_name,
        },
        "Song PDF": registration.song_pdf_url ? {
          link: registration.song_pdf_url,
          text: registration.song_title,
        } : null,
        "Bank Name": registration.bank_name,
        "Bank Account Name": registration.bank_account_name,
        "Bank Account Number": registration.bank_account_number,
        "Payment Receipt": {
          link: registration.payment_receipt_url,
          text: `${registration.registrant_name} - ${new Date(registration.created_at).toLocaleDateString()}`,
        },
      },
    };

    // Send data to Lark form
    const larkResponse = await fetch(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${event.lark_base}/tables/${event.lark_table}/records`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify(larkFormData),
      }
    );

    if (!larkResponse.ok) {
      throw new Error(`Failed to send data to Lark: ${larkResponse.statusText}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Data sent to Lark successfully" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending data to Lark:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}); 