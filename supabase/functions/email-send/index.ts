import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, forwardToN8n, signN8nJwt } from "../_shared/n8n.ts";

/**
 * email-send — proxies email send requests (registration confirmation,
 * masterclass confirmation, group class confirmation) to the n8n
 * `send-email` webhook with a server-signed JWT.
 *
 * The email HTML is composed client-side from translation-driven templates
 * and posted here as `{ to, subject, message }`. This function does NOT
 * construct the email body — it just authenticates and forwards.
 */
serve(
  withCors(async (req) => {
    const token = await signN8nJwt();
    return await forwardToN8n(req, {
      url: "https://n8n.kangritel.com/webhook/send-email",
      method: "POST",
      authHeader: `Bearer ${token}`,
    });
  })
);
