
# Prospects Page Enhancement + Dormant Prospect Email Digest

This plan covers all four improvements in one implementation pass:

1. Priority flagging + Last Contacted tracking (with Log Contact button)
2. Contact details visible in the table
3. Prospect tasks with email reminders
4. Twice-weekly email digest for dormant prospects (Monday + Thursday)

---

## 1. Database Migration

Two new columns on the `prospects` table (confirmed they don't exist yet):
- `priority` — text, nullable (`'High'`, `'Medium'`, `'Low'`)
- `last_contacted_at` — timestamptz, nullable

New table: `prospect_tasks`
```
prospect_tasks
  id              uuid PK default gen_random_uuid()
  prospect_id     uuid NOT NULL → prospects(id) ON DELETE CASCADE
  org_id          uuid nullable
  created_by      uuid nullable (user_id)
  title           text NOT NULL
  notes           text nullable
  due_date        date nullable
  completed       boolean default false
  reminder_at     timestamptz nullable   ← triggers email on this date/time
  reminder_sent   boolean default false
  created_at      timestamptz default now()
  updated_at      timestamptz default now()
```

RLS policies on `prospect_tasks` mirror `prospect_follow_up_dates` — checking that the parent prospect belongs to the user's org via `get_user_org_ids(auth.uid())`.

---

## 2. New Edge Functions

### A. `send-prospect-task-reminders`
- Runs every 15 minutes via pg_cron
- Queries `prospect_tasks` where `reminder_at <= now()` AND `reminder_sent = false` AND `completed = false`
- Joins to `prospects` (name) and `profiles` (email of `created_by`)
- Sends one email per task creator via Resend: subject "Reminder: [task title] — [prospect name]"
- Sets `reminder_sent = true` after sending
- Uses existing `RESEND_API_KEY` and `listings@logistics-space.net` sender

### B. `dormant-prospects-digest`
- Runs on a cron schedule: **Monday and Thursday at 8:00 AM MST (15:00 UTC)**
- Cron expression: `0 15 * * 1,4`
- Logic:
  1. Calculates a threshold date = 14 days ago (2 weeks without contact)
  2. Queries active prospects per org where `last_contacted_at` is older than 14 days OR is null AND prospect `status != 'Closed'`
  3. Groups by `user_id` — each agent in the org gets their own email listing only their prospects
  4. Fetches each agent's email from `profiles`
  5. Sends a digest email to each agent via Resend
- Email format: table of dormant prospects showing Name, Company, Type, Days Since Contact, Follow-up Date
- Skips agents with no dormant prospects (no empty emails)

---

## 3. Frontend Changes

### `src/types/prospect.ts`
- Add `priority?: string | null` to `Prospect` interface
- Add `last_contacted_at?: string | null` to `Prospect` interface
- Add `priority?: string`, `email?: string`, `phone?: string` to `ProspectFormData`

### `src/hooks/useProspects.ts`
- Add `useLogProspectContact()` mutation — sets `last_contacted_at = now()` for a given prospect ID
- Update `sanitizeProspectData` to include `priority`, `email`, `phone`

### `src/hooks/useProspectTasks.ts` (new file)
- `useProspectTasks(prospectId)` — query hook
- `useCreateTask()` — insert mutation
- `useUpdateTask()` — update mutation
- `useDeleteTask()` — delete mutation
- `useToggleTaskCompleted()` — toggle completed mutation

### `src/components/prospects/ProspectsTable.tsx`
**New/changed columns:**
- **Priority** — colour-coded badge inline: Red chip = High, Yellow = Medium, Blue = Low, none = no badge
- **Contact** — phone number and email shown as a sub-line beneath the prospect name (already in same column), with clickable `tel:` and `mailto:` links
- **Last Contacted** — relative label ("Today", "3d ago", "Never") with a small `Phone` icon button for one-tap log contact (uses `e.stopPropagation()` to avoid row navigation)

**Filter bar additions:**
- Priority dropdown: All / High / Medium / Low

**Sort order update:**
- Priority descending (High → Medium → Low → None) then `follow_up_date` ascending

### `src/components/prospects/ProspectFormDialog.tsx`
- Add **Priority** select field (High / Medium / Low)
- Add **Email** field (already in DB, currently missing from form)
- Add **Phone** field (already in DB, currently missing from form)

### `src/components/prospects/ProspectTasksSection.tsx` (new file)
A new section for the prospect detail page:
- List of tasks with title, due date, completion checkbox
- Add Task button → inline form within the section (no dialog needed for simplicity)
- Each task row shows: checkbox, title, due date, optional reminder indicator, delete button
- Completed tasks struck-through and sorted to the bottom
- Optional email reminder date + time selector per task

### `src/components/prospects/TaskFormDialog.tsx` (new file)
Small dialog for adding/editing a task:
- Title (required text input)
- Notes (optional textarea)
- Due Date (date picker)
- Email reminder — date + time ("Send me an email reminder on…"), optional

### `src/pages/ProspectDetail.tsx`
- Add `ProspectTasksSection` component to the detail layout

### `src/components/prospects/ProspectViewCard.tsx`
- Display `priority` badge
- Display `last_contacted_at` with relative label
- Display `email` and `phone` as clickable links

---

## 4. Cron Scheduling

Both cron jobs are set up via the `supabase--read-query` insert tool (not migrations) since they contain project-specific URLs and the anon key:

**Task reminders:** every 15 minutes
**Dormant digest:** `0 15 * * 1,4` — 15:00 UTC = 8:00 AM MST, Monday + Thursday

---

## Technical Summary

**Files to create:**
- `supabase/functions/send-prospect-task-reminders/index.ts`
- `supabase/functions/dormant-prospects-digest/index.ts`
- `src/hooks/useProspectTasks.ts`
- `src/components/prospects/ProspectTasksSection.tsx`
- `src/components/prospects/TaskFormDialog.tsx`
- DB migration (new columns + new table)

**Files to modify:**
- `src/types/prospect.ts`
- `src/hooks/useProspects.ts`
- `src/components/prospects/ProspectsTable.tsx`
- `src/components/prospects/ProspectFormDialog.tsx`
- `src/components/prospects/ProspectViewCard.tsx`
- `src/pages/ProspectDetail.tsx`
