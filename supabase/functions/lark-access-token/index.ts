import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, basicAuthHeader, forwardToN8n } from "../_shared/n8n.ts";

/**
 * lark-access-token — proxies the browser's request for a Lark access token
 * to the n8n bridge using server-held basic-auth credentials.
 *
 * Request:  POST (no body required)
 * Response: the upstream n8n response, typically `{ lark_access_token: "…" }`
 */
serve(
  withCors(async (req) => {
    return await forwardToN8n(req, {
      url: "https://n8n.kangritel.com/webhook/lark-access-token",
      method: "POST",
      authHeader: basicAuthHeader(),
      forwardBody: false,
    });
  })
);
