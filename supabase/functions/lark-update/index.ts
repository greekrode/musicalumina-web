import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, basicAuthHeader, forwardToN8n } from "../_shared/n8n.ts";

/**
 * lark-update — proxies Lark record updates (video-URL write-back from the
 * submission page) to the n8n bridge. Method is PUT to match the upstream
 * semantics.
 */
serve(
  withCors(async (req) => {
    return await forwardToN8n(req, {
      url: "https://n8n.kangritel.com/webhook/update-lark-record",
      method: "PUT",
      authHeader: basicAuthHeader(),
    });
  })
);
