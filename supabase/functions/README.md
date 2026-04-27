# Supabase Edge Functions

Server-side proxies that hold the credentials the browser must not see.

Before this PR, the client bundle read `VITE_N8N_USERNAME`, `VITE_N8N_PASSWORD`,
and `VITE_JWT_SECRET` directly and called the n8n → Lark bridge. All three
values were therefore readable by anyone who opened the site's source. That
made the n8n webhook an open ingestion endpoint and the HS256 signing key
a shared secret with every visitor.

The six functions in this directory close that gap. Each one:

1. Receives a request from the client via `supabase.functions.invoke(name, { body })`.
2. Reads the real credentials from `Deno.env` (never in the client bundle).
3. Signs a JWT or attaches basic-auth as the upstream webhook expects.
4. Forwards the request to `https://n8n.kangritel.com/webhook/…` and
   streams the upstream response back to the browser.

## Inventory

| Function | Auth to n8n | Client callers |
| --- | --- | --- |
| `lark-access-token` | Basic auth | `LarkService.getAccessToken()` |
| `lark-search` | Basic auth | `LarkService.searchParticipantData()` (video submission) |
| `lark-update` | Basic auth | `LarkService.updateParticipantVideo()` (video submission) |
| `lark-send` | Bearer (HS256 JWT) | `LarkService.sendRegistrationData()` (registration mirror) |
| `email-send` | Bearer (HS256 JWT) | `EmailService.send*RegistrationEmail()` |
| `whatsapp-send` | Bearer (HS256 JWT) | `WhatsAppService.send*RegistrationMessage()` |

Shared helpers live in `_shared/n8n.ts` (CORS wrapper, JWT signer, basic-auth
builder, upstream-proxy helper). `_shared/cors.ts` is the same CORS tuple
the existing `send-contact-email` / `send-registration-email` functions
already use.

## One-time setup

You need the Supabase CLI and a project linked:

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
```

## Set the server-side secrets

Pull the current credentials from wherever they live today (Vercel env, n8n
config, password manager) and set them once against the Supabase project:

```bash
supabase secrets set \
  N8N_USERNAME="…" \
  N8N_PASSWORD="…" \
  JWT_SECRET="…"
```

Verify:

```bash
supabase secrets list
```

**Rotate all three before cutting over.** The old values shipped in every
prior production build and should be treated as leaked.

## Deploy

Deploy each function independently so a bad deploy on one doesn't take the
rest down:

```bash
supabase functions deploy lark-access-token
supabase functions deploy lark-search
supabase functions deploy lark-update
supabase functions deploy lark-send
supabase functions deploy email-send
supabase functions deploy whatsapp-send
```

Or all at once:

```bash
for fn in lark-access-token lark-search lark-update lark-send email-send whatsapp-send; do
  supabase functions deploy "$fn"
done
```

## Smoke-test after deploy

Each function is public-callable with the anon key (same posture as
`send-contact-email`). Hit them with curl to confirm the secrets wired up
correctly before switching traffic.

Example for `lark-access-token` (should return `{"lark_access_token":"…"}`):

```bash
curl -i -X POST \
  "$SUPABASE_URL/functions/v1/lark-access-token" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

Example for `lark-search`:

```bash
curl -i -X POST \
  "$SUPABASE_URL/functions/v1/lark-search" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "base_id": "DPxNbSyPEa918OsuMJWlzy43gId",
    "table_id": "tblh4z8siDb2qt50",
    "view_id": "vewx2setSe",
    "filter": {"conjunction":"and","conditions":[{"field_name":"Registration Reference Code","operator":"is","value":["TEST-REF"]}]}
  }'
```

Expect the same JSON shape the old direct-fetch call used to return — the
client code doesn't care.

## Ongoing maintenance

- **Rotating credentials** — change the values in n8n, then
  `supabase secrets set …` with the new pair. No redeploy needed; the
  function reads `Deno.env` at request time.
- **Changing the upstream URL** — edit the URL in the relevant
  `index.ts`, then `supabase functions deploy <name>`.
- **Adding rate-limiting** — the functions currently just proxy. If a
  webhook starts seeing abuse, add a per-IP / per-ref-code rate check
  in `_shared/n8n.ts` before `forwardToN8n()` fires.

## Why not a single proxy function

One function per webhook keeps each handler ~20 lines, makes the intent
obvious from the URL (`lark-search` vs `send-to-lark`), and lets Supabase
scale / log / alert on them independently. The cost is a little more
boilerplate, which the `_shared/n8n.ts` helper keeps under 5 lines per
function.
