# Musical Lumina — Design System Reference

_Phase 1 deliverable. This file documents the tokens and primitives that every subsequent page and component should consume. If something isn't here, it isn't part of the system yet._

Preview all primitives live at: [`/design-system`](http://localhost:5173/design-system)

---

## 1. Brand Anchors

Four colors, never swapped, never substituted.

| Token | Value | Role |
|---|---|---|
| `offWhite` | `#FFFBEF` | Canvas. Everything sits on this. |
| `burgundy` | `#491822` | Primary ink. Headings, structural depth. |
| `marigold` | `#E2A225` | Accent. CTAs, highlights — sparingly. |
| `charcoal` | `#2D2D2D` | Body ink. Long-form reading. |

Extended shades (`burgundy-50` … `burgundy-800`, `marigold-50` … `marigold-800`) exist for interaction states. Do not introduce new brand hues.

---

## 2. Surface System

Layered ivory — hierarchy through tonal shifts, not shadows.

| Token | Use |
|---|---|
| `bg-surface-canvas` | Default page background |
| `bg-surface-canvas-warm` | Subtle section shift (adjacent sections) |
| `bg-surface-canvas-mist` | Accent section (feature spotlights) |
| `bg-surface-elevated` | Modals, floated cards, popovers |
| `bg-surface-inverse` | Dark hero / footer sections (burgundy-700) |

---

## 3. Ink System

Semantic text color. Prefer these over raw `text-burgundy` / `text-charcoal` in new code.

| Token | Use | Contrast |
|---|---|---|
| `text-ink-primary` | Headings, key emphasis (burgundy) | AAA on offwhite |
| `text-ink-body` | Body prose (charcoal) | AAA on offwhite |
| `text-ink-muted` | Metadata, secondary copy | AA on offwhite |
| `text-ink-subtle` | Disabled, placeholder | Decorative only |
| `text-ink-accent` | Eyebrows, inline highlights (marigold-700) | AA on offwhite |
| `text-ink-inverse` | On dark surfaces | Pairs with `surface-inverse` |

**Never** put `text-ink-subtle` on body copy — it's only for placeholder-level content.

---

## 4. Structural Rules

| Token | Use |
|---|---|
| `border-rule-hairline` | 10% burgundy — default card / divider |
| `border-rule-subtle` | 18% burgundy — stronger separation |
| `border-rule-strong` | 35% burgundy — assertive, emphasis |
| `border-rule-marigold` | Full marigold — signature accent line |

---

## 5. Typography Scale

Fluid, `clamp()`-based. Apply via utility class or `text-*` shorthand.

| Utility class | Tailwind class | Role | Scale |
|---|---|---|---|
| `.type-display-xl` | `text-display-xl` | Hero headline | 48 → 88px |
| `.type-display-lg` | `text-display-lg` | Page title | 40 → 64px |
| `.type-display-md` | `text-display-md` | Large section | 32 → 48px |
| `.type-headline-lg` | `text-headline-lg` | Section header | 28 → 40px |
| `.type-headline-md` | `text-headline-md` | Subsection | 24 → 32px |
| `.type-headline-sm` | `text-headline-sm` | Card title | 20 → 24px |
| `.type-title-md` | `text-title-md` | Minor emphasis (sans) | 18px |
| `.type-body-lg` | `text-body-lg` | Prominent prose | 18px |
| `.type-body-md` | `text-body-md` | Default body | 16px |
| `.type-body-sm` | `text-body-sm` | Dense body / forms | 15px |
| `.type-caption` | `text-caption` | Metadata | 13px |
| `.type-label` | `text-label` | Uppercase eyebrow | 12px + wide tracking |

**Fonts:**
- Display & headlines → **Noto Serif** (`font-serif`)
- Body, UI, labels → **Manrope** (`font-sans`)
- Monospace (rare) → system mono

Legacy aliases `font-playfair` and `font-open-sans` are preserved but now resolve to Noto Serif and Manrope respectively. Migrate to `font-serif` / `font-sans` over time.

---

## 6. Spacing — "The Pause"

8-point base. Editorial pauses between sections are the brand signature.

| Token | Value |
|---|---|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-4` | 16px |
| `space-5` | 24px |
| `space-7` | 48px |
| `space-8` | 64px |
| `space-9` | 96px |
| `space-10` | 120px ("The Pause") |
| `pause-section` | `clamp(64px, fluid, 120px)` |
| `pause-major` | `clamp(80px, fluid, 160px)` |

Use `<Section pause="md">` to get `pause-section` applied automatically.

---

## 7. Motion

| Token | Curve | Use |
|---|---|---|
| `ease-out-quart` | `cubic-bezier(0.25, 1, 0.5, 1)` | Default — most interactions |
| `ease-out-expo` | `cubic-bezier(0.19, 1, 0.22, 1)` | Large reveals (page-level) |
| `ease-in-out-quart` | `cubic-bezier(0.76, 0, 0.24, 1)` | Symmetric transitions |

**Never** use bounce or elastic curves. Real objects decelerate smoothly.

Durations: `duration-instant` (100ms), `duration-fast` (180ms), `duration-base` (240ms), `duration-slow` (400ms), `duration-slower` (700ms).

Reduced motion is respected globally via `prefers-reduced-motion`.

---

## 8. Primitives

All live in `src/components/ui/`. Import from `@/components/ui/<name>`.

### `Button`
Variants: `default` (marigold CTA), `secondary` (burgundy fill), `outline`, `ghost`, `link`, `destructive`, `elegant` (legacy).
Sizes: `sm`, `default`, `lg`, `xl`, `icon`.
APIs preserved for all existing admin usages.

### `Card`
Sub-components: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `CardEyebrow` (new).
Variants: `default`, `inset`, `editorial`, `quiet`.
Content-type markers via `accent`: `event` | `masterclass` | `group` | `past`.
No drop shadows — hairline outline + optional top-border accent.

### `Input` / `Textarea`
Two variants: `default` (editorial underline) and `boxed` (admin forms).
Marigold focus line, hairline burgundy border by default.

### `Label`
Variants: `default` (sentence case, admin) and `editorial` (uppercase eyebrow).

### `Badge`
Variants: `default`, `solid`, `accent`, `outline`, `ghost`.
Status pairing: `open` | `closed` | `upcoming` | `ended` | `error`.
Optional `dot` prop for status indicator.

### `Section` + `Container`
`<Section tone="..." pause="..." rule="...">` applies surface tone and vertical rhythm.
`<Container size="..." gutter="...">` constrains content width and sets responsive edge margins.

### `PageHeader`
Composable: `PageHeaderEyebrow`, `PageHeaderTitle`, `PageHeaderLede`, `PageHeaderMeta`, `PageHeaderActions`.
Align options: `start` (editorial, default), `center`, `split` (magazine spread).

### `WireframeWave` / `WaveDivider` / `NoteGlyph`
Signature decorative SVG components. Tunable lines, amplitude, opacity.
`WaveDivider` replaces `<hr>` between sections when a visual flourish is wanted.

### `Eyebrow`
Lightweight standalone uppercase marker. Optional leading rule for editorial flourish.

---

## 9. Usage Guidelines (enforce these in review)

**DO**
- Use `Section` + `Container` to compose every page — never hand-roll max-widths.
- Reach for semantic ink tokens (`text-ink-muted`) before raw colors.
- Apply `accent` to event cards so content types are glanceable.
- Pair eyebrow + title + lede on every page header — three-beat editorial rhythm.

**DON'T**
- Add drop shadows. Ever. Use `border-rule-*` for depth.
- Introduce new font families. Noto Serif + Manrope is the full system.
- Reach for marigold outside CTAs, eyebrows, or the WaveDivider. It loses impact at volume.
- Use `rounded-lg` or larger. Default is `rounded-sm` (4px). Containers stay sharp at `rounded-none`.
- Animate height directly — use `grid-template-rows` transition or framer-motion.

---

## 10. Open Questions — to be resolved in later phases

- **Content-type accent colors**: currently `burgundy / marigold / charcoal / muted` for event / masterclass / group / past. Do we want a fourth distinct color for festivals? (Phase 3 decision.)
- **Admin density mode**: boxed inputs are already wired, but a future `density="compact"` prop on `Section` could tighten spacing in admin tables. Defer to Phase 6.
- **Dark mode**: explicitly deferred. All tokens use direct CSS values, not HSL triplets, to keep light-mode-first simple. Adding dark later = introduce a parallel `[data-theme="dark"]` block with the same token names.

---

_Last updated: 2026-04-24 • Phase 1 complete • Phase 2 (Navigation + Footer) pending approval._
