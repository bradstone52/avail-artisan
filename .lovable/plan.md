
# RocketReach Contact Finder Module

## Overview

Build a "Contact Finder" panel within the CRE Tracker, accessible as a new tab, that lets users search for professionals by name + company (or browse employees at a company) via the RocketReach API. Found contacts can optionally be saved as a **Prospect Ideas** record.

---

## Step 1 — Secure the API Key

First, the API key will be requested via the secrets tool. The key is stored securely on the backend and accessed only from a Supabase Edge Function — it is never exposed to the browser.

**Where to get your key:** Log in to RocketReach → Account Settings → Generate New API Key.

---

## Step 2 — Backend Edge Function

A new edge function `supabase/functions/rocketreach-lookup/index.ts` will proxy all API calls to RocketReach. This keeps the API key server-side.

**Two operations supported:**

| Operation | RocketReach Endpoint | Use Case |
|---|---|---|
| `person_lookup` | `GET /v3/person/lookup` | Look up a specific person by name + company or LinkedIn URL |
| `people_search` | `POST /v3/searches/people` | Search all people at a company by name/title |

**Request shape from frontend:**
```json
{ "operation": "person_lookup", "name": "Jane Smith", "company": "CBRE" }
{ "operation": "people_search", "company": "JLL", "title": "leasing" }
```

**Returns:** Normalized results with `name`, `title`, `company`, `emails[]`, `phones[]`, `linkedin_url`.

---

## Step 3 — Database: `prospect_ideas` Table

A new table `prospect_ideas` will store saved contacts found via RocketReach.

```sql
CREATE TABLE public.prospect_ideas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  created_by  uuid NOT NULL,
  name        text NOT NULL,
  title       text,
  company     text,
  email       text,
  phone       text,
  linkedin_url text,
  notes       text,
  source      text DEFAULT 'RocketReach',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
```

RLS policies will restrict all access to authenticated org members only.

---

## Step 4 — Frontend Components

### New Tab in CRE Tracker

A new **"Contact Finder"** tab will be added to the CRE Tracker alongside Deals, Prospects, etc.

### `ContactFinderTab` Component

Two search modes via a toggle:

**Mode 1 — Person Lookup**
- Fields: Name, Company/Domain
- Button: "Look Up"
- Returns a single result card with name, title, emails, phones

**Mode 2 — Company Search**
- Fields: Company Name, optional Title/Role filter
- Button: "Search"
- Returns a list of matching people at that company

### Result Cards

Each result card shows:
- Name + title + company
- Email(s) with copy button
- Phone(s) with copy button
- LinkedIn URL if available
- **"Save as Prospect Idea"** button → opens a small confirm/edit sheet to save to `prospect_ideas`

### Prospect Ideas List

Below the search panel, a collapsible section shows previously saved Prospect Ideas from the `prospect_ideas` table, with columns: Name, Title, Company, Email, Phone, Saved date. Each row has a "Convert to Prospect" action that pre-fills the standard Prospect form.

---

## Step 5 — Navigation

Add **"Contact Finder"** as a new tab item in the CRE Tracker tab list (alongside Overview, Deals, Prospects, etc.).

---

## Technical Details

- **Auth**: Edge function validates the user JWT via `supabase.auth.getClaims()` before proxying requests
- **CORS**: Standard CORS headers applied to all edge function responses
- **Error handling**: RocketReach rate limit (429) and no-result (404) errors surfaced cleanly to the UI
- **Credits**: RocketReach only charges credits for successful lookups — the UI will note this
- **Hook**: `useContactFinder` hook wraps the edge function call with loading/error state
- **Hook**: `useProspectIdeas` hook for CRUD on the `prospect_ideas` table

---

## Files to Create/Modify

| File | Action |
|---|---|
| `supabase/functions/rocketreach-lookup/index.ts` | Create — API proxy edge function |
| `src/pages/CRETracker.tsx` | Modify — add Contact Finder tab |
| `src/components/cre-tracker/ContactFinderTab.tsx` | Create — main tab component |
| `src/components/cre-tracker/ContactResultCard.tsx` | Create — individual result card |
| `src/components/cre-tracker/ProspectIdeasSection.tsx` | Create — saved ideas list |
| `src/hooks/useContactFinder.ts` | Create — edge function wrapper hook |
| `src/hooks/useProspectIdeas.ts` | Create — CRUD hook for prospect_ideas |
| DB migration | Create — `prospect_ideas` table + RLS |

