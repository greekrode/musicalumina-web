# Musica Lumina Web

The public website and administration portal for Musica Lumina. The application publishes competitions, festivals, masterclasses, group classes, and artist programmes, and supports the registration and scheduling workflows behind them.

## What is included

- Public event discovery and detail pages
- English and Indonesian content
- Registration flows with repertoire, document, and payment-proof uploads
- Masterclass date, time-slot, capacity, break, unavailable-time, and named-hold management
- Clerk-protected administration for events, categories, jury, registrations, customers, and artists in residence
- Supabase Postgres, Storage, Row Level Security, migrations, and Edge Functions
- Lark, email, and WhatsApp integrations through server-side Supabase functions

## Technology

- React 18, TypeScript, Vite, and React Router
- Tailwind CSS with Radix UI primitives
- Clerk for administrator authentication
- Supabase for data, file storage, and serverless functions
- Vitest and Testing Library
- Vercel for web hosting

## Local setup

### Requirements

- Node.js 22 or newer
- npm
- Access to a configured Supabase project
- A Clerk publishable key
- A TinyMCE API key for rich-text fields in the admin portal

### Install and run

```bash
git clone git@github.com:greekrode/musicalumina-web.git
cd musicalumina-web
npm ci
cp .env.example .env
npm run dev
```

The development server is available at `http://localhost:5173` by default.

## Environment variables

Only browser-safe values belong in `.env`. Vite embeds every `VITE_*` value in the client bundle.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Public Supabase anonymous key; access is enforced by RLS |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Administrator authentication |
| `VITE_TINYMCE_API_KEY` | Admin | Rich-text editing in admin forms |

Copy [.env.example](.env.example) as the starting point. Never place the Supabase service-role key, n8n credentials, or JWT signing secrets in a `VITE_*` variable.

Server-side integration secrets are configured as Supabase secrets. Deployment and rotation instructions are in [supabase/functions/README.md](supabase/functions/README.md).

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks without emitting files |
| `npm run test:run` | Run the test suite once |
| `npm run test:coverage` | Run tests and create a coverage report |

Run the same checks as CI before opening a pull request:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

## Supabase workflow

Database changes must be committed as timestamped SQL files in `supabase/migrations`. Link the CLI to the intended project before applying migrations:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Review migrations before pushing them, especially when working against production. Edge Functions live in `supabase/functions` and are deployed separately from the Vite application.

## Project layout

```text
src/
  assets/          Images bundled by Vite
  components/      Shared, registration, and admin components
  hooks/           Data-fetching and browser hooks
  lib/             Supabase client, integrations, translations, and utilities
  pages/           Public and admin route components
  styles/          Design tokens
supabase/
  functions/       Edge Functions and shared server-side helpers
  migrations/      Versioned database schema changes
public/             Files copied directly into the web build
.github/workflows/  Continuous integration
```

The current visual language is documented in [DESIGN.md](DESIGN.md) and [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

## Deployment

Vercel builds the Vite application and uses [vercel.json](vercel.json) to route client-side URLs to `index.html`. Configure the four client environment variables in each Vercel environment, and manage sensitive integration credentials through Supabase secrets.
