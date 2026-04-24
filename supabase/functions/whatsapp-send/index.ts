import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, forwardToN8n, signN8nJwt } from "../_shared/n8n.ts";

/**
 * whatsapp-send — proxies WhatsApp confirmation messages to the n8n
 * `send-whatsapp-message` webhook with a server-signed JWT.
 *
 * Request body shape mirrors what the client used to send directly, so
 * the upstream n8n workflow doesn't need any changes.
 */
serve(
  withCors(async (req) => {
    const token = await signN8nJwt();
    return await forwardToN8n(req, {
      url: "https://n8n.kangritel.com/webhook/send-whatsapp-message",
      method: "POST",
      authHeader: `Bearer ${token}`,
    });
  })
);
