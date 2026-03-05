import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateUserTask, useUpdateUserTask } from '@/hooks/useUserTasks';
import type { UserTask, UserTaskFormData } from '@/types/tasks';

interface UserTaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: UserTask;
}

const EMPTY_FORM: UserTaskFormData = { title: '', notes: '', due_date: '', reminder_at: '' };

export function UserTaskFormDialog({ open, onOpenChange, task }: UserTaskFormDialogProps) {
  const createTask = useCreateUserTask();
  const updateTask = useUpdateUserTask();
  const isEditing = !!task;
  const [formData, setFormData] = useState<UserTaskFormData>(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      if (task) {
        setFormData({
          title: task.title,
          notes: task.notes ?? '',
          due_date: task.due_date ?? '',
          reminder_at: task.reminder_at ? task.reminder_at.slice(0, 16) : '',
        });
      } else {
        setFormData(EMPTY_FORM);
      }
    }
  }, [open, task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateTask.mutateAsync({
          id: task.id,
          title: formData.title,
          notes: formData.notes || null,
          due_date: formData.due_date || null,
          reminder_at: formData.reminder_at ? new Date(formData.reminder_at).toISOString() : task.reminder_at,
        });
      } else {
        await createTask.mutateAsync(formData);
      }
      onOpenChange(false);
    } catch {
      // handled by mutation
    }
  };

  const isPending = createTask.isPending || updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'Add Personal Task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
          <div className="space-y-2">
            <Label htmlFor="ut-title">Title *</Label>
            <Input
              id="ut-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Review lease draft, Call landlord"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ut-notes">Notes</Label>
            <Textarea
              id="ut-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Additional details..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ut-due-date">Due Date</Label>
            <Input
              id="ut-due-date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ut-reminder">Email Reminder</Label>
            <p className="text-xs text-muted-foreground">Send yourself a reminder at this date and time</p>
            <Input
              id="ut-reminder"
              type="datetime-local"
              value={formData.reminder_at}
              onChange={(e) => setFormData({ ...formData, reminder_at: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Task')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
