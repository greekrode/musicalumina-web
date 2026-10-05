// Retired 2026-10-05. This function forwarded whatever the caller sent
// (recipients, message content, Lark base/table/record), so anyone with the
// public anon key could use it as a relay. Replaced by registration-notify
// and video-submission, which build everything server-side.
Deno.serve(() =>
  new Response(JSON.stringify({ error: "This endpoint has been retired." }), {
    status: 410,
    headers: { "Content-Type": "application/json" },
  })
);
