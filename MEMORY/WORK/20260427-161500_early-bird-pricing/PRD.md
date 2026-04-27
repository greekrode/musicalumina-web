---
task: Add early bird pricing and dates to events
slug: 20260427-161500_early-bird-pricing
effort: advanced
phase: complete
progress: 24/24
mode: interactive
started: 2026-04-27T16:15:00+07:00
updated: 2026-04-27T16:20:00+07:00
---

## Context
Add early bird pricing tier to event_subcategories. Current schema has registration_fee (regular) and final_registration_fee (deadline). Adding a lower early_bird tier with an end date. Display on EventDetails; edit in admin SubcategoryModal.

### Risks
- database.types.ts is manually maintained — must stay in sync with migration
- SubcategoryModal foreign fee tables are complex; adding a third one must follow exact same pattern
- EventDetails fee section is deeply nested; insertion must not break existing layout

## Criteria
- [x] ISC-1: Migration adds early_bird_registration_fee numeric nullable column
- [x] ISC-2: Migration adds early_bird_end_date timestamptz nullable column
- [x] ISC-3: Migration adds early_bird_foreign_registration_fee jsonb nullable column
- [x] ISC-4: database.types.ts Row has all 3 new fields as nullable
- [x] ISC-5: database.types.ts Insert has all 3 new fields as optional
- [x] ISC-6: database.types.ts Update has all 3 new fields as optional
- [x] ISC-7: EventDetails local EventCategory type includes 3 new fields
- [x] ISC-8: EventDetails shows early bird fee row when early_bird_end_date is in future
- [x] ISC-9: EventDetails shows "Until [date]" next to early bird label
- [x] ISC-10: EventDetails hides early bird row when end date has passed
- [x] ISC-11: EventDetails shows foreign early bird fees column when data exists
- [x] ISC-12: SubcategoryModal zod schema includes early_bird_registration_fee nullable number
- [x] ISC-13: SubcategoryModal zod schema includes early_bird_end_date nullable string
- [x] ISC-14: SubcategoryModal zod schema includes early_bird_foreign_registration_fee nullable array
- [x] ISC-15: SubcategoryModal useState init includes all 3 early bird fields
- [x] ISC-16: SubcategoryModal useEffect reset includes all 3 early bird fields
- [x] ISC-17: SubcategoryModal has early_bird_registration_fee number input
- [x] ISC-18: SubcategoryModal has early_bird_end_date date input
- [x] ISC-19: SubcategoryModal has foreign early bird fees add/edit/remove table
- [x] ISC-20: EN translations have earlyBirdFee, earlyBirdEnds, earlyBirdForeignFees keys
- [x] ISC-21: ID translations have the same 3 keys
- [x] ISC-22: Events without early bird data display unchanged (no regression)
- [x] ISC-23: npm run build passes with zero TypeScript errors
- [x] ISC-24: npm run lint passes clean

## Decisions

## Verification

- ISC-1/2/3: SQL query confirmed `early_bird_registration_fee numeric nullable`, `early_bird_end_date timestamptz nullable`, `early_bird_foreign_registration_fee jsonb nullable` all present in `event_subcategories`
- ISC-4/5/6: `grep early_bird database.types.ts` shows 9 matches (3 fields × Row/Insert/Update)
- ISC-7: `EventDetails.tsx:44` local type has `early_bird_foreign_registration_fee`
- ISC-8/9/10: `EventDetails.tsx:942` `isEarlyBirdActive` check; `983` conditional render with `earlyBirdEnds` date label; hides when `new Date(sub.early_bird_end_date) <= new Date()`
- ISC-11: `EventDetails.tsx:1071` `earlyBirdFees` extracted from `sub.early_bird_foreign_registration_fee`; column added when `hasEarlyBirdForeignFees`
- ISC-12–19: `npm run build` passed with 0 TypeScript errors after all SubcategoryModal changes
- ISC-20/21: Translations confirmed EN (`"Early Bird Fee"`, `"Until"`, `"Early Bird (Foreign)"`) and ID (`"Biaya Early Bird"`, `"Hingga"`, `"Early Bird (Asing)"`)
- ISC-22: All early bird renders are guarded by `isEarlyBirdActive` / null checks — no regression for existing subcategories
- ISC-23: `npm run build` → `✓ built in 6.08s`, no TypeScript errors
- ISC-24: `npm run lint` → clean exit
