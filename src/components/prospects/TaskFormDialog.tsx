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
import { useCreateProspectTask, useUpdateProspectTask } from '@/hooks/useProspectTasks';
import type { ProspectTask, ProspectTaskFormData } from '@/types/prospect';

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId: string;
  task?: ProspectTask; // if provided, we're editing
}

const EMPTY_FORM: ProspectTaskFormData = { title: '', notes: '', due_date: '', reminder_at: '' };

export function TaskFormDialog({ open, onOpenChange, prospectId, task }: TaskFormDialogProps) {
  const createTask = useCreateProspectTask();
  const updateTask = useUpdateProspectTask();
  const isEditing = !!task;

  const [formData, setFormData] = useState<ProspectTaskFormData>(EMPTY_FORM);

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
          prospectId,
          title: formData.title,
          notes: formData.notes || null,
          due_date: formData.due_date || null,
          reminder_at: formData.reminder_at ? new Date(formData.reminder_at).toISOString() : task.reminder_at,
        });
      } else {
        await createTask.mutateAsync({ prospectId, formData });
      }
      onOpenChange(false);
    } catch {
      // handled by mutation
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const isPending = createTask.isPending || updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'Add Task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Send proposal, Follow up on tour"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea
              id="task-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Additional details..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-due-date">Due Date</Label>
            <Input
              id="task-due-date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-reminder">Email Reminder</Label>
            <p className="text-xs text-muted-foreground">Send me an email reminder at this date and time</p>
            <Input
              id="task-reminder"
              type="datetime-local"
              value={formData.reminder_at}
              onChange={(e) => setFormData({ ...formData, reminder_at: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
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
