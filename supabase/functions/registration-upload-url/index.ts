import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonResponse, withCors } from "../_shared/n8n.ts";

/**
 * registration-upload-url — mints the long-lived signed URL for a file the
 * public registration form just uploaded to `registration-documents`.
 *
 * Visitors may upload to that bucket but can no longer read or list it, so
 * they cannot sign their own upload. This function signs only an object that
 * exists and was created in the last 15 minutes; the random path is known
 * only to the uploader. Older documents cannot be fetched through here.
 */
const BUCKET = "registration-documents";
const FRESH_MS = 15 * 60 * 1000;
const ONE_YEAR_S = 365 * 24 * 60 * 60;

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

serve(
  withCors(async (req) => {
    const { path } = await req.json().catch(() => ({}));
    if (typeof path !== "string" || !/^(birth-certificates|song-pdfs|payment-receipts)\/[A-Za-z0-9]+\.(pdf|jpe?g|png)$/i.test(path)) {
      return jsonResponse({ error: "Invalid path" }, 400);
    }
    const slash = path.lastIndexOf("/");
    const folder = path.slice(0, slash);
    const name = path.slice(slash + 1);

    const { data: files, error: listError } = await admin.storage.from(BUCKET).list(folder, { search: name, limit: 5 });
    if (listError) throw listError;
    const file = files?.find((f) => f.name === name);
    if (!file?.created_at || Date.now() - new Date(file.created_at).getTime() > FRESH_MS) {
      return jsonResponse({ error: "Upload not found or too old" }, 404);
    }

    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, ONE_YEAR_S);
    if (error || !data?.signedUrl) throw error ?? new Error("Could not sign upload");
    return jsonResponse({ signedUrl: data.signedUrl });
  }),
);
