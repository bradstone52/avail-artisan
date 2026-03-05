export interface UserTask {
  id: string;
  user_id: string;
  org_id: string | null;
  title: string;
  notes: string | null;
  due_date: string | null;
  completed: boolean;
  reminder_at: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserTaskFormData {
  title: string;
  notes: string;
  due_date: string;
  reminder_at: string;
}
