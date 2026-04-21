# ClearView CRE — Implementation Plan

**Context:** Post-audit consolidated plan. All architectural and design decisions made; ready to execute across 8 Claude Code sessions. Reference this document at the start of each session.

**Repo:** `github.com/bradstone52/avail-artisan`
**Stack:** React + TypeScript + Vite + Tailwind + shadcn/ui on Supabase
**Hosted:** `logistics-space.net`

---

## Decision Summary

| Area | Decision |
|---|---|
| App identity | Rename Snapshot Builder / Distribution Intel → **ClearView CRE** |
| Terminology | Issue / Snapshot → **Market Report** |
| Navigation | Flatten — promote Deals, Prospects to top-level; drop CRE Tracker container |
| Dashboard | "My Day" hero + compact ops strip |
| Transactions | Rebuild as **Lease Comps** (primary) + thin Sales tab |
| Tenants → Prospects | "Expiring Soon" filter on Prospects, no auto-creation |
| My Tasks | Everything on plate: tasks + conditions + deposits + follow-ups, urgency-sectioned |
| Color system | Drop Prospects row tinting; zero-value alert cards go neutral |
| Delete safety | Small button in "…" menu + standard confirmation modal |
| Admin surfaces | Dedicated subpages per module (Market Listings → Admin, Properties → Admin) |
| BrokerageDB | Rename to Brokerages, move under Admin |
| Doug | Confirmed app user — invite as Member role |
| Role system | Collapse to 2 tiers: **Admin** (Brad) / **Member** (Doug). Remove Sync Operator. |
| Sync Operator role | Remove — re-add if team grows beyond two |
| Public Market Website | Separate audit later, don't touch in this pass |

---

## Target Sidebar Structure

```
Dashboard               (My Day + ops strip)
Deals                   (was CRE Tracker → Deals)
Prospects               (was CRE Tracker → Prospects)
Market Listings
Internal Listings       (was CRE Tracker → Internal Listings)
Distribution
Properties
Tenants
Lease Comps             (was Transactions)
My Tasks                (was CRE Tracker → My Tasks)
—
Admin                   (Management + Brokerages + Public Market Website)
```

Rationale for this order: Deals/Prospects first because they're daily destinations; listings modules grouped together; reference modules (Properties, Tenants, Lease Comps) below; utility modules (My Tasks, Admin) at bottom. Distribution stays as a full module because Market Reports publishing is its own workflow.

---

## Target Module States

### Dashboard — "My Day"

**Hero section:**
- Overdue actions count with expanded list (from My Tasks aggregator, **scoped to current user**)
- Next 7 days: closings, deal conditions, follow-up dates, deposits (color-dotted by type, matching the existing CRE Tracker calendar legend)
- Primary CTA: "View Prospects" (or whichever is most actioned)

**Compact ops strip (below hero, one row of 4 stat cards):**
- Active Deals (count + total value)
- Open Prospects (count)
- Internal Listings (active count)
- Market Reports YTD (count)

**Remove or demote:**
- "Recent Issues" section (rename → Recent Market Reports; consider moving to Distribution page)
- "Data Summary" card (demote to Properties or remove entirely)
- "Quick Actions" panel (redundant once sidebar is flatter)

**Rename:**
- Page subtitle: "Manage your distribution market intelligence" → something like "Welcome back, Brad" or just remove

---

### Deals (promoted top-level)

**List page:**
- Keep table, keep "New Deal" button
- Drop Deal # column (mostly empty)
- Keep Columns / Comfortable density toggle

**Detail page:**
- Move red DELETE button → "…" menu in top right (alongside Generate Deal Sheet, Generate Deal Summary)
- Standard confirmation modal on delete
- Collapse redundant Commission section at bottom of Deal Details (keep Financial Summary sidebar)
- Keep Important Dates section as-is (conditions styling is working correctly)

---

### Prospects (promoted top-level)

**List page:**
- Drop A/B/C row tinting entirely
- Keep the letter badge (A/B/C) — it's already clear
- Add "Expiring Soon" filter chip — toggles on to show prospects where an associated tenant lease expires within N months (default 18)
- New logic: when clicking an expiring tenant from Tenants, carry tenant data into pre-filled "Create Prospect" dialog

**Detail page:**
- Move DELETE to "…" menu, standard confirmation
- Fix `? ?` placeholder rendering on task cards (null handling in task card component)
- Add "Link to Deal" / "Convert to Deal" pattern (lifted from Internal Listings)
- Seller/Buyer fields on future Deal creation should accept Prospect references

---

### Market Listings

**Main page:**
- Keep: Add Listing, search, filters, table
- Keep stat cards: Total Listings, Distribution Warehouses, Geocoded, Link Health
- Remove Duplicates stat card
- Move to new admin subpage (`/market-listings/admin`): Check Links, Monthly Updates, Audit PDF, Audit Website, Fix Geocoding, Fix Links
- Dismiss persistent "← → Scroll with arrow keys" hint — make it a one-time toast or tooltip on hover

**Table:**
- Reduce 7 action icons per row → 2-3 most-used + kebab menu for rest
- Tooltip "DW" and "CALG. QUAD." on header hover (or write them out)
- Fix property name duplication (row shows "Rosemont / Rosemont / Rocky View" instead of "Rosemont / address / city")
- Document what the pink-highlighted row state means (add legend near table)

**New subpage: `/market-listings/admin`**
- Check Links
- Monthly Updates (clarify: this updates what?)
- Audit PDF
- Audit Website
- Fix Geocoding
- Fix Links
- Consider whether Check Links and Fix Links overlap — rename for clarity or consolidate

---

### Distribution

**Listings sub-tab:** no changes needed — clean as-is.

**Recipients sub-tab:** no changes needed.

**Batches sub-tab:**
- Investigate 0/0 counts on all batches — either pipeline isn't incrementing recipients/replies, or this feature was built-but-unused
- Rename page title "Snapshot Builder" → use ClearView CRE branding in sidebar header
- Rename "Distribution Availabilities — [Month]" batches to "Market Report — [Month]" or similar

---

### Internal Listings (promoted top-level)

- Already clean — keep as-is
- Standardize POWER field format (Bay 3 shows "100", 4975 shows "600A / 600V" — decide on canonical format, migrate existing)
- Keep Linked Deal pattern (this is the reference implementation for cross-module entity bridging — port to Prospects)

---

### Properties

**Main page:**
- Keep: Add Property, search, filters, table, Map View
- Keep stat cards but replace "Property Types: 7" with "Without Active Listings" count (currently 354 - 218 = 136)
- Move to new admin subpage (`/properties/admin`): Save All Brochures, Sync Market Listings, Syncing progress indicator
- Move "Needs Review" from top-right → filter row as a filter chip

**Detail page:**
- Rename top-right buttons: "Edit Pin" → "Edit Map Pin", "Edit" → "Edit Details"
- Or merge into single Edit page with "Reposition on Map" action
- Clarify what "Refresh" button does

**New subpage: `/properties/admin`**
- Save All Brochures
- Sync Market Listings
- Syncing progress (or move to toast if intermittent)

---

### Tenants

**All Tenants view:** no changes.

**Expiries view:**
- Zero-value alert cards go neutral: "Within 6 Months: 0" and "Expired: 0" should not be styled red when value is 0
- Add action button on tenant row: "Create Prospect from this tenant" (pre-fills name, company, expiry, current address, size)

---

### Lease Comps (formerly Transactions)

**Module rename:**
- Transactions → Lease Comps
- Sidebar label: "Lease Comps"
- URL: `/transactions` → `/lease-comps`

**Primary tab: Lease Comps**
- Schema: address, size (SF), rate ($/SF), term (years), commencement date, tenant (if known), submarket, source (text — appraisal name/date or "internal")
- Drop Buyer/Tenant and Price columns from current Transactions view
- Filter bar: submarket, size range, commencement date range
- Primary CTA: "Add Lease Comp" button → lean form with only the above fields, targeting sub-30-second entry

**Secondary tab: Sales**
- Thin — just a table of occasional noteworthy sales for one-off entry
- Schema: address, size, sale price, buyer, close date, notes
- Not expected to be comprehensive

**Data migration:**
- Existing Transactions rows: inspect 46 lease rows — migrate usable data to new schema
- Existing 13 sale rows: migrate to Sales tab, keep only ones with populated price/date

**Future (separate session):** PDF appraisal ingestion — parse uploaded appraisal PDFs, extract comp tables, pre-populate Lease Comp entries for review. Reuse parsing pattern from utility billing app.

---

### My Tasks (promoted top-level)

**Unified "everything on my plate" view:**

**Sections (urgency-ordered):**
- Overdue
- Today
- Next 7 Days
- Next 30 Days

**Each item has a type badge:**
- Task (personal or prospect task)
- Condition (deal condition deadline)
- Deposit (deal deposit due)
- Follow-up (prospect follow-up date)

**Data model changes:**
- Tasks query needs to UNION across: personal tasks, prospect tasks, deal conditions, deal deposits, prospect follow-up dates
- Each item keeps its original "source" link (click → opens the Deal or Prospect detail page)

**Edit Task modal:**
- Add "No reminder" option / toggle (currently reminder datetime field is always required)

**Personal Tasks section:**
- Keep — still lives in My Tasks as explicit "add your own task" space

---

### Admin (reorganized)

**Sub-pages:**
- Management (Users & Roles, Invites, Database Management) — current content, mostly keep
- Brokerages (was BrokerageDB — rename, move under Admin)
- Public Market Website (current content, keep)

**Fix in Management:**
- Remove duplicate Brad Stone record (keep the Admin one, delete the No Role one)
- Invite Doug Johannson as Member role
- Collapse role system: Admin (Brad) / Member (Doug). Remove Sync Operator tier — re-add later if team grows

---

## Cross-Cutting Fixes

**Color semantics (global):**
- Red / pink = urgency, overdue, error (NOT priority, NOT volume)
- Green = active, healthy, success
- Blue = neutral, informational, active-but-not-urgent
- Yellow = warning, attention-needed
- Zero-value alert cards render neutral (gray) until value > 0

**Delete UX pattern (global):**
- Destructive actions live in "…" menus, not primary button positions
- Standard confirmation modal (no typed confirmation)
- Confirmation dialog shows the record name being deleted

**Admin vs user separation (global):**
- Admin tools (sync, audit, fix, migrate) live on dedicated subpages
- User actions (create, edit, search, filter) live on main pages
- Heuristic: if it touches the database or takes >2 seconds, it's admin

---

## Claude Code Sessions

### Session 1: P0 Bugs
**Scope:** Fix data/rendering bugs that affect correctness.

**Changes:**
1. Property name duplication in Distribution Listings table — investigate row component, fix mapping so second line shows address/street or null, not name repeated
2. `? ?` placeholder bug on Prospect detail task cards — null handling for assignee/reminder metadata
3. Delete duplicate Brad Stone user record in Supabase (keep Admin role record, delete No Role record; verify foreign key integrity first)
4. Add Doug Johannson user invite flow — send invite to Doug as **Member** role. Every reference to Doug throughout the app (Selling Agent, Secondary Agent, etc.) should link to this new user record once created.

**Prompt starter:**
```
I'm working on avail-artisan (github.com/bradstone52/avail-artisan).
Repo layout uses React + TypeScript + Vite + shadcn/ui on Supabase.

Fix four P0 bugs:

1. In the Distribution Listings table, property rows render as:
   "Rosemont Industrial Park / Rosemont Industrial Park / Rocky View County"
   The second line should be address or null, not the name repeated.
   Find the listings table row component and fix the mapping.

2. On Prospect detail page (e.g., Direct Optics), task cards show
   "? ?" in place of assignee/reminder metadata. Likely null handling
   in the task card component. Find and fix.

3. Investigate duplicate Brad Stone user records. Two rows exist with
   same email brad@cvpartners.ca — one joined Jan 7 2026 with "No Role",
   one joined Apr 19 2026 with "Admin". Before deleting the No Role one,
   check foreign key references. Show me the query plan before executing.

Start with (1) and (2). Show me the diffs before applying.
```

---

### Session 2: Delete Safety
**Scope:** Move DELETE buttons to "…" menus on Deal detail and Prospect detail pages.

**Changes:**
- Locate the DELETE button component on Deal detail and Prospect detail
- Replace full-width red button with small "…" menu in top-right (alongside other top-right actions like Generate Deal Sheet, Generate Deal Summary)
- Delete action in menu uses standard shadcn AlertDialog with "Are you sure?" pattern, including the record name in the confirmation text

**Prompt starter:**
```
On Deal detail and Prospect detail pages, the red DELETE button sits
next to the title as a primary action. Move deletion to a "…" dropdown
menu in the top-right corner alongside existing actions (Generate Deal
Sheet, etc.). Use shadcn DropdownMenu + AlertDialog. The confirmation
modal should include the record address/name in its description.

Pages: /deals/:id and /prospects/:id (or similar paths).
```

---

### Session 3: Navigation Flatten + Rename
**Scope:** Restructure sidebar, rename BrokerageDB to Brokerages, drop CRE Tracker container.

**Changes:**
- Sidebar items and order per target structure above
- Remove CRE Tracker wrapper route/layout
- Promote `/cre-tracker?tab=deals` → `/deals`, `/cre-tracker?tab=prospects` → `/prospects`, `/cre-tracker?tab=listings` → `/internal-listings`, `/cre-tracker?tab=tasks` → `/my-tasks`, `/cre-tracker?tab=contacts` → `/admin/brokerages`
- Set up redirects from old URLs for a release or two
- Rename BrokerageDB → Brokerages everywhere (sidebar, page title, internal component names optional)
- Update any nav-aware code (breadcrumbs, active state, back buttons)

**Prompt starter:**
```
Flatten the sidebar. Current structure buries Deals, Prospects, Internal
Listings, My Tasks, and BrokerageDB under "CRE Tracker". Target structure:

Dashboard, Deals, Prospects, Market Listings, Internal Listings,
Distribution, Properties, Tenants, Lease Comps, My Tasks, Admin

Tasks:
1. Remove the CRE Tracker container and its tab bar
2. Promote each child to a top-level route:
   /cre-tracker?tab=deals → /deals
   /cre-tracker?tab=prospects → /prospects
   /cre-tracker?tab=listings → /internal-listings
   /cre-tracker?tab=tasks → /my-tasks
   /cre-tracker?tab=contacts → /admin/brokerages
3. Rename "BrokerageDB" → "Brokerages" in sidebar label and page title
4. Add redirects from old URLs (returning 301 to new paths for now)
5. Update active-state logic and any breadcrumbs

Show me the routing diff first before touching components.
```

---

### Session 4: Identity & Terminology Pass
**Scope:** Rename Snapshot Builder → ClearView CRE; Issue/Snapshot → Market Report.

**Changes:**
- Sidebar header: "Snapshot Builder / Distribution Intel" → "ClearView CRE / Industrial Brokerage" (or similar)
- Dashboard title/tagline (prep for Session 8 reframe but at minimum update the title)
- Page `<title>` tags across all routes
- Favicon / PWA manifest name if applicable
- Email sender names in scheduled functions (`send-prospect-task-reminders`, `dormant-prospects-digest`, `stale-listings-report`)
- PDF export branding (Generate Deal Summary, etc.)
- All user-facing "Issue" / "Snapshot" → "Market Report"
  - "Create Issue" button → "Create Market Report"
  - "RECENT ISSUES / N market snapshots" → "RECENT MARKET REPORTS / N published"
  - Distribution batch names "Distribution Availabilities — [Month]" → "Market Report — [Month]"
  - URL paths `/issues/*` → `/market-reports/*` with redirects

**Prompt starter:**
```
Rename pass. Two substitutions across the codebase:

1. App identity: "Snapshot Builder / Distribution Intel" → "ClearView CRE"
   Affects: sidebar header, page titles, favicon/manifest, email sender
   names in scheduled edge functions, PDF export footers.

2. Terminology: "Issue" and "Snapshot" → "Market Report"
   Affects: button labels, page titles, card headings, distribution
   batch naming convention, URL paths (/issues → /market-reports with
   redirect), database column names if obvious.

Before applying, show me a list of every file that'll change and
group the changes by type (user-facing label vs code identifier vs
URL path). I want to approve the scope before the rename runs.
```

---

### Session 5: Admin Surface Split
**Scope:** Create `/market-listings/admin` and `/properties/admin` subpages; move maintenance tools there.

**Changes:**
- Create `/market-listings/admin` subpage/route
- Move Check Links, Monthly Updates, Audit PDF, Audit Website, Fix Geocoding, Fix Links buttons there
- Main Market Listings page keeps only Add Listing + filters
- Create `/properties/admin` subpage/route
- Move Save All Brochures, Sync Market Listings there
- Move Syncing progress indicator — either hide when idle, or move to a toast, or keep in admin subpage
- Both admin subpages get their own breadcrumb: "Market Listings › Admin"

**Prompt starter:**
```
Split admin tools off the main Market Listings and Properties pages
onto dedicated subpages.

Create /market-listings/admin route with:
- Check Links
- Monthly Updates
- Audit PDF
- Audit Website
- Fix Geocoding
- Fix Links

Main /market-listings page keeps: Add Listing button, search, filters,
stat cards, table. Remove those 6 admin buttons from the header.

Create /properties/admin route with:
- Save All Brochures
- Sync Market Listings
- Syncing progress indicator

Main /properties page keeps: Add Property, search, filters, stats, table,
Map View. Move the "Syncing 160/279" indicator to the admin page (or
suppress when idle).

Use consistent layout between both admin subpages. Show me the route
scaffolding before moving the individual buttons.
```

---

### Session 6: Visual Consistency Pass
**Scope:** Color system fixes, table cleanup, small polish.

**Changes:**
- Drop row tinting on Prospects list (keep A/B/C badge)
- Zero-value alert cards render neutral (Tenants Expiries: "Within 6 Months: 0" and "Expired: 0" should not be red when 0)
- Market Listings table: reduce 7 action icons per row → top 3 (map pin, external link, edit) + kebab menu for rest
- Dismiss persistent "← → Scroll with arrow keys" hint — make one-time toast or hover tooltip
- Add hover tooltips to "DW" and "CALG. QUAD." column headers
- Drop "Duplicates: 0" stat card on Market Listings
- Replace "Property Types: 7" stat on Properties with "Without Active Listings" count
- Drop Deal # column on Deals list (mostly empty)
- Rename "Edit Pin" → "Edit Map Pin" and "Edit" → "Edit Details" on Property detail

**Prompt starter:**
```
Visual consistency pass. Several small changes across modules:

1. Prospects list (/prospects): drop the A/B/C row background tinting
   (pink/yellow/blue). Keep the letter badge in the Priority column.

2. Tenants Expiries tab: zero-value alert cards should render neutral
   (gray), not red. Check "Within 6 Months: 0" and "Expired: 0".

3. Market Listings table: reduce action icons per row. Keep the top 3
   most-used; move the rest into a kebab (…) menu. Also make the
   "← → Scroll with arrow keys" hint dismissible or one-time only.

4. Remove Duplicates stat card on /market-listings.

5. Replace "Property Types: 7" stat card on /properties with
   "Without Active Listings" (calculate as total - withActiveListings).

6. Drop Deal # column on /deals list (it's mostly empty).

7. On Property detail, rename "Edit Pin" → "Edit Map Pin" and
   "Edit" → "Edit Details".

Ship these as a single commit series if they touch separate files;
otherwise one commit per item.
```

---

### Session 7: Lease Comps Rebuild
**Scope:** Rename Transactions → Lease Comps; restructure schema; build lean entry form.

**Changes:**
- Sidebar rename, route rename `/transactions` → `/lease-comps` (with redirect)
- New schema: lease_comps table with address, size_sf, rate_psf, term_years, commencement_date, tenant_name (nullable), submarket, source
- Thin sales_records table (or secondary tab reading from existing transactions filtered by type=sale)
- Migration: map existing 46 lease rows from transactions → lease_comps schema; map 13 sales rows → sales_records
- New List page: filter by submarket, size range, commencement date; table shows relevant columns only
- New Add Lease Comp form: all fields, smart defaults, optimize for sub-30-second entry
- Thin Sales tab: address, size, sale price, buyer, close date, notes; simple table + simple form

**Prompt starter:**
```
Rebuild the Transactions module as Lease Comps.

1. Rename module:
   - Sidebar: "Transactions" → "Lease Comps"
   - Route: /transactions → /lease-comps (with 301 redirect)

2. New schema (Supabase migration):
   Table: lease_comps
   Fields: id, address (text), size_sf (int), rate_psf (numeric),
   term_years (numeric), commencement_date (date), tenant_name (text,
   nullable), submarket (text), source (text), created_at, updated_at

3. Migrate existing data:
   Look at the current transactions table. Filter rows where type='lease'
   (or equivalent) — there should be ~46 rows. Map populated fields into
   lease_comps schema. Show me the migration SQL before running.

4. Secondary Sales tab:
   Decide: either (a) keep existing transactions table filtered to
   type='sale' for the Sales tab, or (b) create a thin sales_records
   table. Recommend based on current schema.

5. New List page (/lease-comps):
   Table: address, size (SF), rate ($/SF), term (yr), commencement,
   tenant, submarket
   Filters: submarket dropdown, size range, commencement date range
   CTA: "Add Lease Comp" button

6. Lean Add Lease Comp form: all schema fields, submarket pre-fills
   from address geocode if possible, source pre-fills with today's
   date in "Internal MM-DD-YYYY" format. Form should be single-column,
   minimal, optimized for speed.

Show me the migration plan and the new form layout before building.
```

---

### Session 8: Dashboard Reframe + My Tasks Unification + Tenants→Prospects Flow
**Scope:** Largest session. Rebuild Dashboard as "My Day"; unify My Tasks; add Expiring Soon filter on Prospects.

**Changes:**

*Dashboard:*
- New hero: overdue actions list (top 5), next 7 days events (styled calendar entries)
- Compact ops strip below: 4 cards — Active Deals, Open Prospects, Internal Listings, Market Reports YTD
- Remove old Recent Issues (or demote to a link), Data Summary card, Quick Actions panel
- Rename subtitle

*My Tasks:*
- Unified query: UNION across personal tasks, prospect tasks, deal conditions (uncompleted), deal deposits (not yet marked done), prospect follow-up dates
- **Filter by `assigned_to = current_user`** — Brad sees Brad's items, Doug sees Doug's
- Each item has type badge: Task / Condition / Deposit / Follow-up
- Sections: Overdue / Today / Next 7 Days / Next 30 Days
- Click an item → navigate to source entity (deal, prospect, or task detail)
- Edit Task modal: add "No reminder" toggle

*Prospects:*
- Add "Expiring Soon" filter chip (toggles on/off) — shows prospects linked to tenants with expiry within N months (default 18)
- Since prospects aren't auto-created from tenants, the filter also needs a "Suggested" variant showing tenants who could become prospects

*Tenants:*
- Add "Create Prospect" action on tenant row (opens pre-filled Create Prospect dialog)

**Prompt starter:**
```
Three related changes in this session. Build in order, test each
before moving to next.

Part A — Dashboard reframe:
Replace current Dashboard content with "My Day" layout.

Hero (top):
- Overdue Actions: top 5 items from unified My Tasks query, each
  clickable → source entity
- Next 7 Days: styled list of events — closings, deal conditions,
  follow-ups, deposits. Color-dot by type (match existing legend).

Ops strip (below hero, single row of 4 stat cards):
- Active Deals: count + total value
- Open Prospects: count
- Internal Listings: active count
- Market Reports YTD: count

Remove: Recent Issues, Data Summary, Quick Actions sections.
Rename subtitle to something concise (not "Manage your distribution
market intelligence").

Part B — My Tasks unification:
Current page aggregates personal tasks + prospect tasks. Expand to
include deal conditions (uncompleted), deal deposits, prospect
follow-up dates.

Each item row: type badge (Task | Condition | Deposit | Follow-up),
title, source entity link, due date, assigned person.

Sections: Overdue, Today, Next 7 Days, Next 30 Days.

Edit Task modal: add "No reminder" toggle (currently reminder datetime
is required; make it optional).

Part C — Expiring Soon on Prospects + Create Prospect on Tenants:
- On /prospects, add filter chip "Expiring Soon" — toggles filter
  showing prospects linked to tenants expiring within 18 months.
- On /tenants row, add "Create Prospect" action → opens pre-filled
  Create Prospect dialog with tenant data carried over.

Show me the unified My Tasks query before building the UI.
```

---

## Future Sessions (Backlog)

**PDF Appraisal Ingestion for Lease Comps:** Parse uploaded appraisal PDFs, extract comp tables, pre-populate entries. Reuse parsing patterns from utility billing app.

**Public Market Website audit:** Separate pass once internal app is stable. Goals there are SEO, trust signals, inquiry conversion — different problem from internal productivity.

**Linked Deal pattern on Prospects:** The Internal Listings "Convert to Deal / Link Existing Deal / Unlink" pattern is the cleanest cross-module workflow in the app. Port to Prospects so prospect→deal conversion is one click with data carry-over.

**POWER field schema normalization:** Standardize format across Internal Listings (currently "100" vs "600A / 600V"). Likely schema validation + migration.

**Verify Batches pipeline:** All 8 Distribution Batches show 0/0 for recipients/replies. Either fix the increment logic or document as not-wired feature.

---

## Notes for Every Session

- **JWT reminder:** After any edge function deploy, verify JWT stays disabled on user-facing functions (you're working on `verify_jwt = false` in `config.toml` already — finish that before starting Session 5 since admin subpages may call new endpoints).

- **Commit pattern:** One commit per logical change. Session 6 could be 7 small commits; Session 8 should be 3 logical commits (Dashboard, My Tasks, Prospects+Tenants).

- **Before each session:** Paste the Prompt Starter + this plan's relevant Module Target section into Claude Code.

- **Testing pattern:** After each session, smoke-test the touched routes. Session 8 needs most testing because it touches cross-module data queries.
