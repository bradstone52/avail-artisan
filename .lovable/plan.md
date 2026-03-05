
## Plan: Tasks Module in CRE Tracker

### What we're building
A new **"Tasks"** tab in the CRE Tracker (+ sidebar nav entry) with two sections:

1. **My Personal Tasks** — per-user free-form tasks in a new `user_tasks` table. Full CRUD with inline editing.
2. **Prospect Tasks** — all `prospect_tasks` for the org, fully editable (same inline UX as the Prospect detail page). Changes sync back to the Prospects table automatically via shared query keys.

---

### 1. Database migration
**New table: `user_tasks`**
```
id            uuid PK
user_id       uuid NOT NULL
org_id        uuid
title         text NOT NULL
notes         text
due_date      date
completed     boolean DEFAULT false
reminder_at   timestamptz
reminder_sent boolean DEFAULT false
created_at    timestamptz DEFAULT now()
updated_at    timestamptz DEFAULT now()
```
RLS: `user_id = auth.uid()` for all operations. Users own only their own personal tasks.

---

### 2. New files

**`src/types/tasks.ts`**
`UserTask` and `UserTaskFormData` type definitions.

**`src/hooks/useUserTasks.ts`**
CRUD hooks: `useUserTasks`, `useCreateUserTask`, `useUpdateUserTask`, `useToggleUserTaskCompleted`, `useDeleteUserTask`, `useSetUserTaskReminder`. Mirrors `useProspectTasks.ts`.

**`src/components/tasks/UserTaskFormDialog.tsx`**
Form for personal task create/edit. Fields: Title, Notes, Due Date, Email Reminder. No "Assign To" (personal tasks are always owned by the current user).

**`src/components/tasks/PersonalTasksSection.tsx`**
Table showing personal tasks:
- Inline checkbox toggle (same `h-4 border-2` high-visibility style)
- Color-coded due date pill: Red (overdue), Amber (today), Muted (upcoming)
- Double-click row → opens `UserTaskFormDialog`
- Add Task button top-right
- Completed tasks shown below active with `opacity-50` + `line-through`

**`src/components/tasks/ProspectTasksSection.tsx`**
Table showing ALL `prospect_tasks` for the org — **fully editable**:
- Inline checkbox toggle → `useToggleProspectTaskCompleted`
- Double-click row → opens existing `TaskFormDialog` (title, notes, due date, assigned to, reminder)
- "Prospect" column with `<Link to="/prospects/:id">` 
- Assignee chip (avatar + name) using org member profiles
- Filter pills: All / Assigned to me / Incomplete only
- Changes invalidate `['prospect_tasks', prospectId]` + `['prospect_tasks_all']` — auto-syncs to Prospect detail view

**`src/components/cre-tracker/CRETasksTab.tsx`**
Layout container — stacked:
```
[My Personal Tasks]                    [+ Add Task]
PersonalTasksSection

[Prospect Tasks]           [filter pills: All | Mine | Incomplete]
ProspectTasksSection
```

---

### 3. Files to modify

**`src/pages/CRETracker.tsx`**
- Add `'tasks'` to `VALID_TABS`
- Fetch prospect IDs and pass to `useAllProspectTasks` for the tab count
- Add `<TabsContent value="tasks"><CRETasksTab /></TabsContent>`

**`src/components/cre-tracker/CREQuickNav.tsx`**
- Add "My Tasks" hero card with `CheckSquare` icon + incomplete personal task count badge
- Clicking navigates to `?tab=tasks`

**`src/components/layout/AppLayout.tsx`**
- Add `{ name: 'My Tasks', href: '/cre-tracker?tab=tasks', icon: CheckSquare }` inside the CRE Tracker nav group

---

### Key sync guarantee
Both `ProspectTasksSection` (in Tasks module) and `ProspectTasksSection` (in Prospect detail) use the exact same `useProspectTasks` / `useUpdateProspectTask` hooks and invalidate the same query keys. An edit in either location updates the shared database row and both views re-fetch automatically.

---

### Summary
- **1 migration** — `user_tasks` table + RLS
- **5 new files** — types, hooks, 2 task section components, form dialog, tab wrapper
- **3 file edits** — CRETracker page, CREQuickNav, AppLayout
