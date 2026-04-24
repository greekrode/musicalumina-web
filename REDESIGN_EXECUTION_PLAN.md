# Musical Lumina — Redesign Execution Plan

_Author: Designer agent • Date: 2026-04-24 • Status: **Awaiting approval**_

---

## 0. Design Direction (non-negotiable foundation)

The brand direction is **"Ethereal Resonance"** as defined in [DESIGN.md](DESIGN.md) — an editorial, magazine-grade, burgundy-on-ivory aesthetic with marigold as a surgical accent. This is a stronger and more distinctive point-of-view than the palette proposed in [REDESIGN_PLAN.md](REDESIGN_PLAN.md) (charcoal/gold/ivory), which reads as a generic "premium template."

Where REDESIGN_PLAN.md and DESIGN.md conflict, DESIGN.md wins. Decisions logged:

| Topic | REDESIGN_PLAN.md | DESIGN.md | Decision |
|---|---|---|---|
| Primary color | Charcoal Deep #1a1a1a | Burgundy #491822 | **Burgundy** — owns the brand |
| Accent color | Gold #d4af37 | Marigold #E2A225 | **Marigold** — warmer, more signature |
| Background | Ivory #f8f6f1 | Off-White #FFFBEF | **Off-White** — warmer, paper-like |
| Display font | Playfair-like | Noto Serif | **Noto Serif** — Playfair is overused |
| Body font | Inter/Lato | Manrope | **Manrope** — already in spec |
| Corner radius | 4–8px everywhere | 0.25rem functional / 0px large | **Per DESIGN.md** — sharper hierarchy |
| Shadows | "Subtle drop shadows 5–15%" | Reject shadows, use outlines | **Outlines + tonal shifts** |

Everything else in REDESIGN_PLAN.md (mobile-first, interaction states, scalable grids, content-type differentiation, accessibility) is valid and carried forward.

---

## 1. Non-goals (what I will NOT touch)

To guarantee "everything still works," these layers are **frozen** for visual redesign work:

- Data layer (`src/lib/supabase.ts`, `src/lib/database.types.ts`, `src/hooks/*`)
- Supabase edge functions (`supabase/functions/*`)
- Routing structure in [App.tsx](src/App.tsx) — routes and lazy-loading preserved
- Form validation schemas (Zod) and submission handlers
- i18n keys in `src/lib/translations.ts` (may add keys, never rename/remove existing)
- Clerk auth wiring for admin
- File upload flow to Supabase Storage

Redesign is **skin-deep for data plumbing, bone-deep for visuals/layout/interactions.**

---

## 2. Phased Plan

Each phase has a clear deliverable, a verification checklist, and a stopping point for your review. I do not move to the next phase without your approval.

### Phase 1 — Design System Foundation (tokens + primitives)

Goal: establish the visual language so every subsequent phase is consistent.

**Tasks**
1. Wire full tonal palette from DESIGN.md into `tailwind.config.js` (all surface/on-surface/outline tokens, not just the four current colors).
2. Replace font import in [index.css](src/index.css): Noto Serif + Manrope (with `font-display: swap`, proper fallbacks).
3. Add CSS custom properties for fluid type scale using `clamp()` (display-lg, headline-lg/md/sm, title, body-lg/md, label-sm).
4. Add spacing scale tokens (8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 120).
5. Add `wireframe-wave` SVG component and marigold musical-glyph icon set (thin 1.5px stroke).
6. Build primitive components in `src/components/ui/`:
   - `Button` (primary marigold-fill, secondary 1px burgundy outline, ghost text-link, icon button)
   - `Badge` / `StatusPill` (for "Accepting Registrations" / "Closed" / "Upcoming" / "Ended")
   - `Card` (outlined, no shadow; supports `variant: "event" | "masterclass" | "group-class"` with top-border accent)
   - `Input` / `Textarea` / `Select` (bottom-border-only, marigold focus, uppercase label above)
   - `Section` wrapper enforcing "The Pause" (120px vertical rhythm on desktop, fluid down)
   - `PageHeader` for editorial asymmetric titles
7. Document tokens and components in a new `DESIGN_SYSTEM.md` for future reference.

**Verification**: Run `npm run lint`, `npm run build`. Site must still render — Phase 1 is additive only. I do NOT change existing page markup yet.

---

### Phase 2 — Global Chrome (Navigation + Footer)

Goal: reskin the two components every page shares.

**Tasks**
1. Rebuild [Navigation.tsx](src/components/Navigation.tsx): fixed top bar, backdrop blur, Noto Serif nav links, marigold underline for active route, mobile hamburger → full-height drawer with the wireframe-wave backdrop.
2. Rebuild [Footer.tsx](src/components/Footer.tsx): editorial three-column layout on desktop, stacked on mobile; includes language switcher, navigation links, contact, subtle wave glyph.
3. Preserve `LanguageSwitcher.tsx` behavior; restyle only.

**Verification**: Navigate to every existing route. No broken links, no missing translations. Mobile menu opens/closes correctly.

---

### Phase 3 — Public Core (Home, Events, Event Details)

Goal: the pages a visitor sees first.

**Tasks**
1. **[HomePage.tsx](src/pages/HomePage.tsx)** — editorial hero (asymmetric left-aligned Noto Serif headline, trust micro-stats, search/filter entry), then: Featured Events grid (3-col desktop / 2-col tablet / 1-col mobile), Masterclass Spotlight (editorial feature block with instructor portrait), Group Classes rail, "How It Works" three-step with wave divider, testimonial/credibility section, final CTA. Uses `EventCard` variants for content-type differentiation (top-border color: burgundy=event, marigold=masterclass, charcoal=group-class).
2. **[EventsPage.tsx](src/pages/EventsPage.tsx)** — filter shelf (category, date range, status, level), grid/list toggle, active-filter chips, autocomplete search, pagination/load-more. Empty state teaches the filter system.
3. **[EventDetails.tsx](src/pages/EventDetails.tsx)** (largest page at 31KB) — editorial hero, two-column layout (narrative content left, sticky details panel right with status/deadline/fee/CTA), schedule, requirements, jury grid, prize structure, similar events rail. I will decompose this file into sub-components under `src/components/event-details/` to stay under 400 LOC per file.
4. Rebuild [EventCard.tsx](src/components/EventCard.tsx) and [PastEventCard.tsx](src/components/PastEventCard.tsx) using new `Card` primitive + content-type marker.

**Verification**: Click every CTA. Registration modal still opens. Event data fetches correctly. i18n toggles both languages. Lighthouse mobile ≥ 90.

---

### Phase 4 — Public Secondary Pages

Goal: the remaining marketing/informational pages.

**Tasks**
1. [AboutPage.tsx](src/pages/AboutPage.tsx) — editorial long-form with pull quotes, mission block, team/leadership grid.
2. [ContactPage.tsx](src/pages/ContactPage.tsx) — split layout: form left, contact details/map right. Preserves submission handler.
3. [PartnersPage.tsx](src/pages/PartnersPage.tsx) — editorial partner showcase (not a logo grid — tier'd with narrative).
4. [MasterclassDetails.tsx](src/pages/MasterclassDetails.tsx), [GroupClassDetails.tsx](src/pages/GroupClassDetails.tsx), [PastEventDetails.tsx](src/pages/PastEventDetails.tsx), [PastMasterclassDetails.tsx](src/pages/PastMasterclassDetails.tsx) — apply EventDetails pattern with content-type-specific accents.
5. [VideoSubmissionPage.tsx](src/pages/VideoSubmissionPage.tsx) — clean editorial upload flow with inline progress.

**Verification**: Every form submits. Every file upload flow works end-to-end against Supabase Storage.

---

### Phase 5 — Registration & Modals

Goal: fix the oversized registration components without changing their submission contracts.

**Tasks**
1. Decompose [RegistrationModal.tsx](src/components/RegistrationModal.tsx) (32KB), [MasterclassRegistrationModal.tsx](src/components/MasterclassRegistrationModal.tsx) (34KB), [GroupClassRegistrationModal.tsx](src/components/GroupClassRegistrationModal.tsx) (19KB) into step components under `src/components/registration/`:
   - `StepIndicator` (1/2/3 with marigold progress line)
   - `ParticipantDetailsStep`
   - `DocumentsStep` (reuses existing `FileUpload.tsx`)
   - `ReviewStep`
   - `ConfirmationStep`
2. Replace Radix Dialog shell with editorial full-screen sheet on mobile, centered dialog on desktop — backdrop blur on an off-white tint (not dark scrim).
3. Reskin [JuryModal.tsx](src/components/JuryModal.tsx), [TermsModal.tsx](src/components/TermsModal.tsx), [ThankYouModal.tsx](src/components/ThankYouModal.tsx), [LoadingModal.tsx](src/components/LoadingModal.tsx), [InvitationPasswordModal.tsx](src/components/InvitationPasswordModal.tsx) using the new Dialog primitive.
4. Zero changes to Zod schemas or Supabase insert/update calls. Field IDs preserved.

**Verification**: Full end-to-end registration flow for Competition, Masterclass, Group Class. Confirm row lands in Supabase. Confirm email fires. Confirm file uploads to storage.

---

### Phase 6 — Admin Interface

Goal: bring admin into the same design language (currently separated, inconsistent).

**Tasks**
1. Admin layout shell: sidebar nav (collapsible), top bar (breadcrumbs + user menu), consistent with public aesthetic but denser spacing for data work.
2. [Dashboard.tsx](src/pages/admin/Dashboard.tsx) — overview cards (registrations, active events, pending submissions), upcoming-deadline timeline, recent-activity feed.
3. [Events.tsx](src/pages/admin/Events.tsx), [Masterclass.tsx](src/pages/admin/Masterclass.tsx), [Registrations.tsx](src/pages/admin/Registrations.tsx), [Jury.tsx](src/pages/admin/Jury.tsx), [EventCategories.tsx](src/pages/admin/EventCategories.tsx) — table/list views with inline edit, bulk actions, filter/sort, responsive stacking on narrow viewports.
4. [Login.tsx](src/pages/admin/Login.tsx) — editorial split-screen with brand-side imagery + wave texture.
5. Preserve all Clerk wiring and `ProtectedRoute.tsx`.

**Verification**: Admin login, every CRUD operation, every export, jury scoring — all function unchanged.

**Status** (2026-04-24): ✅ complete. Sub-phases landed:
- 6a — Login, Sidebar, AdminLayout, ProtectedRoute
- 6b — Dashboard, Events table, Masterclass table
- 6c — Jury grid, Registrations filter + DataTable + detail Sheet
- 6d — EventCategories (event-grouped sections with CategoryRow)
- 6e — All 6 admin modals rebuilt on the editorial Modal shell:
  InvitationCodesModal, CategoryModal, JuryModal (migrated off shadcn Dialog),
  AddEventModal (latent `status` validation bug fixed, missing Status field added),
  EditEventModal (custom black-scrim modal replaced, manual validation
  collapsed into react-hook-form's Zod resolver, unused handleSubmit /
  redundant console.logs removed), SubcategoryModal (boxed inputs, NoteGlyph
  bullets, section eyebrows for IDR / foreign / repertoire / requirements).
  All Zod schemas, Supabase CRUD, DnD wiring, TinyMCE editors, Lark payloads,
  toast feedback, and storage signed-URL uploads preserved 1:1.

---

### Phase 6f — Schema audit + admin form UX pass

Goal: once every admin modal is editorialized (Phases 6a–6e), step back and audit the forms against the actual Supabase schema.

**Tasks**
1. For each admin modal (AddEvent, EditEvent, Category, Subcategory, Jury, InvitationCodes, Masterclass tools):
   - Pull the column list from the corresponding Supabase table(s).
   - Compare to the form's current fields. Flag:
     - **Missing**: DB columns the form doesn't collect but should (admin can't set from UI today).
     - **Stale**: Form fields writing to columns that no longer exist.
     - **Awkward**: Fields that exist but are hard to use (long text in a tiny input, JSON entered as raw text, date strings typed freehand, etc.).
2. Propose the fix list as a checklist — small, surgical additions per form.
3. Implement the additions per approval, reusing the editorial primitives (Input / Textarea / Label / Section / StatusBanner).
4. Improve general form UX: clearer labels, inline help text, better grouping under eyebrows, auto-suggest where possible, inline validation, save/cancel that actually explains what happens.

Output: every admin form collects the full set of DB fields it should, and every field is sized + explained for the person filling it in.

**Status** (2026-04-24): ✅ complete.
- `database.types.ts` now declares `event_prizes` and `invitation_codes`
  tables (previously missing — caused TS errors in `useEvent` / `useEvents`
  and left `InvitationCodesModal` writing to an untyped table).
- AddEventModal insert payload now includes `start_date`, `lark_base`,
  `lark_table` (previously collected or defaulted but never persisted).
- AddEventModal + EditEventModal both gained an **Integrations** section
  with Lark base / table inputs (previously only EditEventModal kept the
  values around but had no UI to change them).
- AddEventModal default status is now `upcoming` (previously `undefined`,
  which silently failed Zod validation on submit).

Event-table `registration_fee` (number, nullable) was reviewed and left
out of the UI — subcategory-level fees are the live pricing surface; the
event-level column looks like a vestigial field (no reads found in the
public pages). Flag for a data-layer cleanup later if confirmed dead.

### Phase 7 — Footer Rework

Goal: the current footer shipped in Phase 2 is too tall and too contained for the editorial spirit. A second pass to tighten it.

**Tasks**
1. Footer lets content bleed full viewport width — no inner `<Container>` cap, edge-to-edge on desktop.
2. Better stacking — tighter vertical rhythm, less padding per band. Probably halves the total height.
3. Brand name shown as `"Musica Lumina"` (two words), not `"MusicaLumina"`. Fix anywhere it currently appears concatenated in Footer.
4. Copyright centered at the bottom — not left-aligned in the colophon strip.
5. Remove the "Crafted with care · Jakarta" colophon line entirely.
6. Keep all functional content (quick links, contact, partners, language switcher).

### Phase 7.5 — Mobile Responsive Pass

Goal: before Phase 8 polish, acknowledge that phones deserve their own
treatment. Web has room to breathe; mobile does not. This phase tightens
typography floors, trims section pauses, fixes structural layouts that
were designed-for-desktop, and removes visual chrome that only works on
a wide canvas.

**Status** (2026-04-24): ✅ complete.

- **Fluid type floors lowered** in `tokens.css` so a 360-390px phone no
  longer renders a 40px display-lg or a 32px display-md. Ceilings kept as
  is — desktop character unchanged.
- **Section pause floors lowered** (`pause-section` 64 → 44px, `pause-major`
  80 → 56px) so mobile doesn't spend 128px of vertical space per section.
- **Hero top-padding tightened** on HomePage, EventsPage, EventDetails,
  GroupClassDetails, MasterclassDetails, PastEventDetails,
  PastMasterclassDetails, AboutPage, PartnersPage, VideoSubmissionPage —
  `pt-28/32` → `pt-20 md:pt-28 lg:pt-32`. Saves 32-48px per page.
- **ArchiveRow layout restructured**: mobile now stacks date + type meta
  above the title (title gets full column width). Desktop four-column
  grid preserved. Per the screenshot that landed this phase — the narrow
  title column was forcing 3-4 line wraps.
- **Event-details poster hidden on mobile** (`hidden lg:block`) on
  EventDetails, GroupClassDetails, MasterclassDetails. The poster was
  dropping below the content on phones and eating ~60% of the viewport
  for decoration; on a phone, the content is the product.
- **Categories "Jump to" rail now mobile-aware**: the horizontal pill rail
  that previously only appeared on `lg+` now also renders on mobile
  (non-sticky, above the cards) whenever there are 2+ categories. Gives
  phones a fast TOC instead of forcing sequential scrolling.
- **`.no-scrollbar` utility added** to `index.css` for horizontal pill
  rails — removes native scrollbar chrome without breaking scroll.

Deferred to Phase 8: a full keyboard + screen-reader sweep at mobile
viewport sizes.

### Phase 8 — Accessibility, Performance, Polish

Goal: make it ship-quality.

**Tasks**
1. WCAG 2.1 AA audit — test marigold-on-off-white contrast (may need to darken marigold slightly for AA body-text use; keep original for large/decorative).
2. Keyboard-only traversal of every flow.
3. `prefers-reduced-motion` respect across all framer-motion usage.
4. Focus-visible outlines (2px marigold, 2px offset).
5. Image optimization (responsive `srcset`, lazy-loading below fold).
6. Bundle audit — split vendor chunks, confirm lazy routes work.
7. Cross-browser QA (Safari, Chrome, Firefox, mobile Safari, mobile Chrome).
8. Final Lighthouse pass — target 95+ on desktop, 90+ on mobile for all four categories.
9. **Deferred i18n pass** — extract inline English copy added during Phases 3–5 to `src/lib/translations.ts` with Indonesian translations. Run `/humanizer` on all new copy (both EN and ID) to strip AI writing tells. Files with pending extractions: `HomePage.tsx` (`copy` object — hero meta, featured section, howItWorks steps, closing CTA), `EventsPage.tsx` (filter labels, archive heading), any new copy in EventDetails sub-components.

**Status** (2026-04-24): ✅ code-level work complete. Runtime QA (Lighthouse,
cross-browser, screen-reader, keyboard-flow manual runs) remains for human
verification.

- **8a — A11y foundations.**
  - `EventGallery` now pauses auto-advance + drops fade transitions + hides
    the progress bar when `prefers-reduced-motion: reduce` is set. The
    auto-changing carousel was the one violation that could trigger
    vestibular issues.
  - Focus-visible outlines verified on `Button`, `Input`, `Navigation`,
    `Footer`, `EventCard`, `PastEventCard`, `LanguageSwitcher`,
    `EventGallery` controls, registration modals. Admin modals too.
  - Alt text verified on every public-site `<img>` tag.
  - `text-marigold` contrast swept: light-background text (pill rails, nav
    mobile drawer active state) now uses `text-marigold-700` (#9b6a0f) for
    AA-safe body-text contrast. Display-sized numerals and dark-background
    uses keep the canonical marigold.
  - Removed leftover debug `console.log` from `VideoSubmissionPage`.
- **8b — Performance foundations.**
  - **Admin routes now lazy-loaded.** Previously TinyMCE (~500KB) plus the
    dense admin modals all bundled into the public chunk. Every
    `/admin/*` route is now behind its own `Suspense` boundary; public
    users never pay for admin weight.
  - Console-log noise cleaned from `lib/lark.ts`, `lib/whatsapp.ts`,
    `lib/email.ts`, `lib/emailTemplates.ts` — success-path traces removed,
    `console.error` paths preserved for real failure diagnostics.
  - Image lazy-loading audited: above-fold hero images intentionally
    eager (LCP), every below-fold avatar / partner logo / footer mark is
    `loading="lazy"` + `decoding="async"`.
- **8c — i18n extraction.**
  - All eight inline `const copy = { … }` objects (HomePage, EventsPage,
    EventDetails, PastEventDetails, MasterclassDetails,
    PastMasterclassDetails, GroupClassDetails, VideoSubmissionPage) are
    now keys under a single `pageCopy` namespace in `translations.ts`
    with full Indonesian translations.
  - ~40 keys × 2 languages added. Keeping the editorial copy in one
    namespace rather than scattering across `home` / `events` /
    `eventDetails` / etc. so a translator can tune voice in one place.
  - Homepage `copy.howItWorks.steps[]` array turned into an ordinal map
    `["One", "Two", "Three"]` so translation keys stay flat and
    translators aren't editing JSX array literals.
- **8d — Polish.** Stale `// TODO(Phase 7/8)` comments removed. Plan doc
  updated. `npx tsc --noEmit` clean across the whole project.

**Remaining for runtime QA** (not code-reviewable):
- Lighthouse score measurement on deployed build
- Real screen-reader walkthrough (VoiceOver / NVDA)
- Keyboard-only traversal of registration flow
- Cross-browser render check (Safari iOS / Chrome Android specifically)
- `/humanizer` pass on new copy if voice still reads synthetic

---

## 3. What I need from you before starting

1. **Approval of this plan** (or edits to it).
2. Confirmation on **two open questions**:
   - **Dark mode**: REDESIGN_PLAN.md mentions it as optional. DESIGN.md doesn't spec it. Ship light-only first, or design dark tokens in parallel?
   - **Copy**: Am I allowed to *refine* marketing copy on Home/About/Partners for editorial tone, or keep existing strings verbatim and restyle only?
3. Preferred phase cadence: **one phase at a time with review between** (safe, slower), or **batch Phase 1+2 and Phase 3+4** together (faster, more diff to review)?

I do not start any implementation until you reply. Every phase ends at a verification gate so you can catch drift early — which addresses the recent pattern where redesign work went in the wrong direction before course-correcting.
