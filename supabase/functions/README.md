# Supabase Edge Functions

Server-side proxies that hold the credentials the browser must not see.

Before this PR, the client bundle read `VITE_N8N_USERNAME`, `VITE_N8N_PASSWORD`,
and `VITE_JWT_SECRET` directly and called the n8n → Lark bridge. All three
values were therefore readable by anyone who opened the site's source. That
made the n8n webhook an open ingestion endpoint and the HS256 signing key
a shared secret with every visitor.

The proxy functions in this directory close that gap. Each one:

1. Receives a request from the client via `supabase.functions.invoke(name, { body })`.
2. Reads the real credentials from `Deno.env` (never in the client bundle).
3. Signs a JWT or attaches basic-auth as the upstream webhook expects.
4. Forwards the request to `https://hooks.kangritel.com/webhook/…` and
   streams the upstream response back to the browser.

## Inventory

Every public function decides *what* to send from the database, never from the
request body. The browser calls them with the anon key (`edgeFunctions` in
`src/lib/supabase.ts`).

| Function | What it does | Guards |
| --- | --- | --- |
| `registration-notify` | Confirmation email + Lark row for a just-created registration (`{ registrationId, language, turnstileToken }`) | Turnstile `register`, once per registration (`email_sent_at`), 30-min window, values HTML-escaped |
| `video-submission` | Look up a registration by reference code / set its video link once (fixed Lark table) | Turnstile `video`, 20 calls / 15 min / IP |
| `registration-upload-url` | Signs a file the form just uploaded | path allowlist, file must be < 15 min old |
| `invitation-code` | Verifies / redeems invitation codes server-side | 10 / 15 min / IP, 300 / event |
| `sitemap` | Public sitemap | read-only |

Retired (return `410`, kept as stubs so the code matches what is deployed):
`email-send`, `whatsapp-send`, `lark-send`, `lark-search`, `lark-update`,
`lark-access-token`, `send-contact-email`, `send-registration-email`,
`send-to-lark`, `send-whatsapp-message`. Each one forwarded caller-chosen
recipients, content or Lark targets.

Secrets: `TURNSTILE_SECRET` and `TURNSTILE_HOSTNAMES` (production hostnames
only) are set with `supabase secrets set`; the widget site key is public and
lives in `src/components/Turnstile.tsx`.

Shared helpers: `_shared/n8n.ts` (CORS wrapper, JWT signer, basic-auth),
`_shared/guard.ts` (Turnstile, HTML escaping, client IP),
`_shared/registration-email.ts` (email templates).

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

## Clerk auth for the admin (RLS)

The admin signs in with Clerk. The Supabase client sends the Clerk session
token (`accessToken` in `src/lib/supabase.ts`), and RLS calls
`public.is_admin()` / `public.clerk_role()`, which trust only the verified
token's `metadata.role` claim, copied from Clerk publicMetadata. Roles: `admin` (everything), `staff` (web admin, read-only), `reg_staff`
(QR scanner only), `jury` (scoring: own unfinalized scores), `score_staff`
(scoring: view only). Public uploads are signed by the
`registration-upload-url` function and invitation codes are checked by
`invitation-code`; neither table nor bucket is readable with the anon key. Visitors send
no token and use the anon key.

Rollout order (migration `20261005100000_clerk_role_rls.sql`):

1. Clerk dashboard → Integrations → Supabase → activate (adds `role: authenticated`).
2. Supabase dashboard → Authentication → Third-party auth → add Clerk with your Clerk domain.
3. Clerk dashboard → Sessions → Customize session token: `{ "metadata": "{{user.public_metadata}}" }`. Then set each staff user's public metadata to `{ "role": "admin" }`, `{ "role": "jury" }` or `{ "role": "staff" }`.
4. Deploy the web app, then apply the migration (`supabase db push`).
5. Smoke test signed out: home, an event page (registration count), a registration submit, the contact form. Signed in as staff: every admin page, one upload, one registration status change.

QR check-in no longer uses an Edge Function. The scanner app
(`musicalumina-qr-scanner`) ships its own Cloudflare Worker, which calls the
`check_in_pass` RPC with the service role.
