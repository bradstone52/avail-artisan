
# Industrial Underwriting Module

## Overview

Add a new "Underwriter" nav item directly below "Transactions" in the sidebar. This is a full 7-phase AI-assisted underwriting workflow for Calgary industrial properties, powered by the Perplexity API (already configured as a secret: `PERPLEXITY_API_KEY`).

---

## Database Schema (3 migrations)

### Migration 1 — Core tables

```sql
CREATE TABLE public.underwritings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  property_name text NOT NULL,
  address text NOT NULL,
  submarket text NOT NULL,            -- SE | NE | Balzac | Rocky View | Other
  building_size_sf numeric,
  year_built integer,
  land_size_ac numeric,
  proposed_ask_price numeric,
  status text NOT NULL DEFAULT 'draft', -- draft | in_progress | complete
  phase_completion jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.underwriting_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  underwriting_id uuid REFERENCES public.underwritings(id) ON DELETE CASCADE,
  document_type text NOT NULL,        -- rent_roll | operating_statement | lease | site_plan | tax | appraisal
  file_name text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.underwriting_phase_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  underwriting_id uuid REFERENCES public.underwritings(id) ON DELETE CASCADE,
  phase integer NOT NULL,             -- 1–7
  raw_perplexity_response text,       -- full raw text
  structured_data jsonb,              -- parsed/edited broker data
  broker_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (underwriting_id, phase)
);
```

### Migration 2 — Storage bucket

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('underwriting-docs', 'underwriting-docs', false);
```

Plus RLS policies scoped to org members.

### Migration 3 — RLS policies

- `underwritings`: org members can SELECT/INSERT/UPDATE/DELETE their own org's records.
- `underwriting_documents`: same org scope via join to underwritings.
- `underwriting_phase_data`: same org scope.
- `underwriting-docs` bucket: org member read/write via storage.objects policy.

---

## Edge Function: `underwriting-perplexity`

A single multi-operation edge function (pattern: same as `rocketreach-lookup`) that accepts:

```typescript
{ underwritingId, phase, dealContext, tenantData? }
```

It:
1. Validates JWT via `getClaims()`
2. Loads the underwriting record + all phase data from DB
3. Selects the correct prompt template for the phase (1–7)
4. Calls `https://api.perplexity.ai/chat/completions` with model `sonar-pro`, temperature 0.2
5. Saves raw response + attempts JSON parse into `underwriting_phase_data`
6. Returns structured result to frontend

Prompt templates for all 7 phases are embedded server-side in the function (as provided in the spec).

---

## Frontend Architecture

### New files

```
src/pages/Underwriter.tsx                         — list of underwritings
src/pages/UnderwritingDetail.tsx                  — 7-phase tabbed detail view
src/hooks/useUnderwritings.ts                     — CRUD + phase data queries
src/components/underwriter/
  NewUnderwritingDialog.tsx                       — create form (metadata + file upload)
  UnderwritingListTable.tsx                       — table of all underwritings
  phases/
    Phase1Tenancy.tsx                             — tenant table + summary
    Phase2Financials.tsx                          — income statement editor
    Phase3Market.tsx                              — market context + rent comparison
    Phase4Valuation.tsx                           — cap rate sliders + scenario table
    Phase5Risks.tsx                               — editable risk/opportunity lists
    Phase6Memo.tsx                                — rich text memo editor
    Phase7OM.tsx                                  — OM copy editor
  PhaseCard.tsx                                   — shared wrapper (title, button, status)
  PhaseAnalyzeButton.tsx                          — shared "Analyze with Perplexity" button with loading state
```

### Routing

Add to `App.tsx`:
```tsx
<Route path="/underwriter" element={<ProtectedRoute><Underwriter /></ProtectedRoute>} />
<Route path="/underwriter/:id" element={<ProtectedRoute><UnderwritingDetail /></ProtectedRoute>} />
```

### Nav

Add to `AppLayout.tsx` navigation array, directly after the `Transactions` entry:
```tsx
{ name: 'Underwriter', href: '/underwriter', icon: Calculator }
```

---

## Page Designs

### `/underwriter` — List page

- `PageHeader` with title "Underwriter" and "New Underwriting" button
- `UnderwritingListTable`: columns — Property Name, Address, Submarket, Size SF, Status, Phase Progress (7 small dots), Created, Actions
- Clicking a row navigates to `/underwriter/:id`

### `/underwriter/:id` — Detail page

- Top bar: property name, address, submarket badge, "Edit Details" button
- Phase progress indicator: 7 numbered steps showing complete/active/pending
- `Tabs` (Phase 1 through Phase 7) with tab labels:
  - Phase 1: Tenancy
  - Phase 2: Financials
  - Phase 3: Market
  - Phase 4: Valuation
  - Phase 5: Risks
  - Phase 6: Memo
  - Phase 7: OM Content

Each phase tab contains a `PhaseCard` with:
- Phase title and description
- Upload list (for phases that reference documents)
- "Analyze with Perplexity" button (disabled during loading, shows spinner)
- Results section (table/editor) rendered when data exists
- "Save Changes" button for broker edits
- Completion checkmark in the tab when structured_data is saved

---

## Phase UI Details

**Phase 1 – Tenancy**: Editable table (tenant name, unit, SF, dates, rents, lease type, escalations, options, notes). Summary row: total SF, WALT, occupancy. Rollover schedule table. Red flags list.

**Phase 2 – Financials**: Two-column income statement table (Year 1 / Year 2). Each row is editable. NOI row is highlighted. Five health bullets. Three DD questions.

**Phase 3 – Market**: Read-only market summary paragraph. Editable per-tenant market rent comparison table with below/at/above-market badge. Three positioning option cards.

**Phase 4 – Valuation**: Current NOI + Stabilized NOI inputs. Two `Slider` components for cap rate min/max. "Generate scenarios" calls the edge function. Resulting table: cap rate column vs current-NOI value vs stabilized-NOI value. Lock button per row. Pricing commentary paragraph.

**Phase 5 – Risks**: Two side-by-side editable lists (Risks | Opportunities). Add/remove/reorder bullets.

**Phase 6 – Memo**: `Textarea` (large, ~30 rows) pre-filled with Perplexity markdown output. Broker edits inline. "Export to PDF" button (uses existing `generate-pdf` edge function or browser print).

**Phase 7 – OM**: Similar `Textarea` per section (7 sections). Copy-to-clipboard button per section.

---

## Hook Design (`useUnderwritings.ts`)

```typescript
useUnderwritings()          // list all for org
useUnderwriting(id)         // single record + all phase data
useCreateUnderwriting()     // mutation
useUpdateUnderwriting()     // mutation
useUploadDocument()         // upload to storage + insert underwriting_documents row
useAnalyzePhase()           // calls edge function, saves result
useSavePhaseData()          // saves broker edits to underwriting_phase_data
```

---

## Technical Notes

- File uploads go to the `underwriting-docs` storage bucket using the same pattern as `internal-listing-assets` (multipart via `supabase.storage.from().upload()`).
- The Perplexity call uses `sonar-pro` (multi-step reasoning, good for financial document analysis). Temperature 0.2 for deterministic output.
- For Phases 1–5, the prompt asks Perplexity to return a JSON code block. The edge function strips the markdown fences and `JSON.parse()`s the result, storing structured data in the `structured_data` jsonb column. On parse failure, it still saves the raw text.
- Phases 6–7 return markdown text (stored as `raw_perplexity_response`, also copied to `structured_data.text`).
- The edge function reads previously saved phase data from the DB and passes relevant context (e.g., Phase 2 passes tenant data from Phase 1's structured_data) to later phases automatically.
- Loading states use a `phaseLoading` map keyed by phase number so multiple phase buttons don't interfere.
- All raw Perplexity responses are stored verbatim for debugging.
- `supabase/config.toml` gets a new entry: `[functions.underwriting-perplexity] verify_jwt = false`

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Modify | `src/components/layout/AppLayout.tsx` — add nav entry |
| Modify | `src/App.tsx` — add 2 routes |
| Create | `src/pages/Underwriter.tsx` |
| Create | `src/pages/UnderwritingDetail.tsx` |
| Create | `src/hooks/useUnderwritings.ts` |
| Create | `src/components/underwriter/NewUnderwritingDialog.tsx` |
| Create | `src/components/underwriter/UnderwritingListTable.tsx` |
| Create | `src/components/underwriter/PhaseCard.tsx` |
| Create | `src/components/underwriter/phases/Phase1Tenancy.tsx` |
| Create | `src/components/underwriter/phases/Phase2Financials.tsx` |
| Create | `src/components/underwriter/phases/Phase3Market.tsx` |
| Create | `src/components/underwriter/phases/Phase4Valuation.tsx` |
| Create | `src/components/underwriter/phases/Phase5Risks.tsx` |
| Create | `src/components/underwriter/phases/Phase6Memo.tsx` |
| Create | `src/components/underwriter/phases/Phase7OM.tsx` |
| Create | `supabase/functions/underwriting-perplexity/index.ts` |
| Modify | `supabase/config.toml` — add function entry |
| DB | Migration: 3 tables + storage bucket + RLS |
