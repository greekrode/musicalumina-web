import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, forwardToN8n, signN8nJwt } from "../_shared/n8n.ts";

/**
 * lark-send — proxies the registration-mirror payload to the n8n
 * `send-to-lark` webhook. Uses a server-signed short-lived HS256 JWT
 * instead of basic auth (matching the upstream webhook's expectation).
 *
 * The client no longer needs to know the JWT_SECRET; it just sends the
 * `{ data: { event, formData } }` envelope and this function signs +
 * forwards.
 */
serve(
  withCors(async (req) => {
    const token = await signN8nJwt();
    return await forwardToN8n(req, {
      url: "https://n8n.kangritel.com/webhook/send-to-lark",
      method: "POST",
      authHeader: `Bearer ${token}`,
    });
  })
);
