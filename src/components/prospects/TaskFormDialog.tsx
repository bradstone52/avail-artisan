import { useState } from 'react';
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
import { useCreateProspectTask } from '@/hooks/useProspectTasks';
import type { ProspectTaskFormData } from '@/types/prospect';

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId: string;
}

export function TaskFormDialog({ open, onOpenChange, prospectId }: TaskFormDialogProps) {
  const createTask = useCreateProspectTask();

  const [formData, setFormData] = useState<ProspectTaskFormData>({
    title: '',
    notes: '',
    due_date: '',
    reminder_at: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTask.mutateAsync({ prospectId, formData });
      setFormData({ title: '', notes: '', due_date: '', reminder_at: '' });
      onOpenChange(false);
    } catch {
      // handled by mutation
    }
  };

  const handleClose = () => {
    setFormData({ title: '', notes: '', due_date: '', reminder_at: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
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
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? 'Adding...' : 'Add Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
