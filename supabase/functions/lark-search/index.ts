import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, basicAuthHeader, forwardToN8n } from "../_shared/n8n.ts";

/**
 * lark-search — proxies participant-lookup requests from the video-submission
 * page to the n8n bridge.
 *
 * Request body is forwarded verbatim — it already carries the Lark base_id /
 * table_id / view_id / filter that n8n expects. We just attach the basic-auth
 * header with server-held credentials.
 */
serve(
  withCors(async (req) => {
    return await forwardToN8n(req, {
      url: "https://n8n.kangritel.com/webhook/search-lark",
      method: "POST",
      authHeader: basicAuthHeader(),
    });
  })
);
