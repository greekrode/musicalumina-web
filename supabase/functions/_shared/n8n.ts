/**
 * Shared helpers for the six functions that proxy to the n8n bridge.
 *
 * Each function reads server-side env (`N8N_USERNAME` / `N8N_PASSWORD` /
 * `JWT_SECRET`) via `Deno.env`, forwards the request with the correct
 * auth, and returns the upstream response as-is. Keeping the logic here
 * means each function file stays 30-40 lines and the auth convention is
 * defined once.
 *
 * Upstream URLs live with each caller because the paths encode intent
 * (e.g. `search-lark` vs `send-to-lark`) and picking the wrong one
 * silently writes to the wrong Lark table.
 */
import * as jose from "https://esm.sh/jose@5.6.3";
import { corsHeaders } from "./cors.ts";

/** Wrap a handler with the CORS preflight short-circuit. */
export function withCors(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    try {
      return await handler(req);
    } catch (error) {
      console.error("Edge function error:", error);
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return jsonResponse({ error: message }, 500);
    }
  };
}

/** Standard JSON response with CORS + content-type. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Build the `Authorization: Basic …` header for n8n basic-auth webhooks. */
export function basicAuthHeader(): string {
  const username = Deno.env.get("N8N_USERNAME");
  const password = Deno.env.get("N8N_PASSWORD");
  if (!username || !password) {
    throw new Error("N8N_USERNAME / N8N_PASSWORD not configured");
  }
  return `Basic ${btoa(`${username}:${password}`)}`;
}

/**
 * Sign a short-lived HS256 JWT for n8n webhooks that use Bearer auth
 * (send-to-lark, send-email, send-whatsapp-message). The issuer claim
 * matches the client's previous implementation so the n8n verifier
 * keeps working unchanged.
 */
export async function signN8nJwt(): Promise<string> {
  const secret = Deno.env.get("JWT_SECRET");
  if (!secret) {
    throw new Error("JWT_SECRET not configured");
  }
  const secretBytes = new TextEncoder().encode(secret);
  return await new jose.SignJWT({ iss: "musical-lumina" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secretBytes);
}

/**
 * Proxy the caller's JSON body to an upstream n8n webhook using the
 * given auth header + HTTP method, then return the upstream status +
 * body to the browser.
 */
export async function forwardToN8n(
  req: Request,
  options: {
    url: string;
    method: "POST" | "PUT";
    authHeader: string;
    /** When true, forward req.json() as the body. When false, send no body. */
    forwardBody?: boolean;
    /** Override the body entirely — used when the client payload needs reshaping. */
    body?: unknown;
  }
): Promise<Response> {
  const { url, method, authHeader, forwardBody = true } = options;

  let body: string | undefined;
  if (options.body !== undefined) {
    body = JSON.stringify(options.body);
  } else if (forwardBody) {
    const raw = await req.text();
    body = raw || undefined;
  }

  const upstream = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body,
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      ...corsHeaders,
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
