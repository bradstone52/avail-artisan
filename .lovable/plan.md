
## Two-Part Plan

---

### Part 1: Fix Doug's Deals Visibility

**Root cause:** The `deals` table SELECT policy requires `is_admin OR user_id = creator OR assigned agent`. Doug is a regular `member` with no agent record, so he sees nothing. The correct fix is to update the SELECT (and UPDATE) RLS policy to allow all org members to view deals — matching how most other tables in this app work.

**Change:** One database migration to widen the `deals` SELECT policy to allow all org members to view deals in their org (while keeping DELETE still restricted to admins/creators).

```sql
-- Replace the overly-strict SELECT policy
DROP POLICY "Authorized users can view deals" ON deals;
CREATE POLICY "Org members can view deals"
  ON deals FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
```

No code changes needed — the existing `useDeals` hook already queries by `org_id`.

---

### Part 2: Task Assignee + Targeted Reminder Emails

**Goal:** When creating/editing a task, allow selecting which team member is the "main" on the task. The reminder email goes to that person's inbox (not just the creator's).

**Database change:** Add `assigned_to uuid` column to `prospect_tasks` (nullable, references a user profile).

**Files to change:**

- **`supabase/migrations/`** — Add `assigned_to` column to `prospect_tasks`
- **`src/types/prospect.ts`** — Add `assigned_to` to `ProspectTask` and `ProspectTaskFormData`
- **`src/hooks/useProspectTasks.ts`** — Include `assigned_to` in create/update mutations
- **`src/components/prospects/TaskFormDialog.tsx`** — Add an "Assigned To" dropdown (fetches org members from `profiles` via org membership), defaulting to the current user
- **`src/components/prospects/ProspectTasksSection.tsx`** — Show an avatar/name chip on each task row for the assignee
- **`supabase/functions/send-prospect-task-reminders/index.ts`** — Look up `assigned_to` profile first; fall back to `created_by` if not set. Send reminder to whichever user's email resolves

**UX:**
- "Assigned To" defaults to the logged-in user when creating a task
- Displayed as a small name chip on the task card
- Reminder email subject will say "You have been assigned a task..." if not the creator
