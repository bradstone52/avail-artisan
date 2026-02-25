import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Plus, Trash2, Bell } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  useProspectTasks,
  useToggleProspectTaskCompleted,
  useDeleteProspectTask,
} from '@/hooks/useProspectTasks';
import { TaskFormDialog } from './TaskFormDialog';
import type { Prospect, ProspectTask } from '@/types/prospect';

interface ProspectTasksSectionProps {
  prospect: Prospect;
}

function DueDateLabel({ date }: { date?: string | null }) {
  if (!date) return null;
  const d = parseISO(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = differenceInDays(d, today);

  if (days < 0) return <span className="text-destructive text-xs font-medium">Overdue</span>;
  if (days === 0) return <span className="text-warning-foreground text-xs font-medium">Due today</span>;
  if (days <= 3) return <span className="text-orange-600 text-xs font-medium">Due {formatDate(date)}</span>;
  return <span className="text-muted-foreground text-xs">{formatDate(date)}</span>;
}

function TaskRow({ task, prospectId }: { task: ProspectTask; prospectId: string }) {
  const toggle = useToggleProspectTaskCompleted();
  const deleteTask = useDeleteProspectTask();

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded border border-foreground/10 bg-card transition-opacity',
        task.completed && 'opacity-50',
      )}
    >
      <Checkbox
        checked={task.completed}
        onCheckedChange={(checked) =>
          toggle.mutate({ id: task.id, prospectId, completed: checked === true })
        }
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', task.completed && 'line-through text-muted-foreground')}>
          {task.title}
        </p>
        {task.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.notes}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <DueDateLabel date={task.due_date} />
          {task.reminder_at && !task.reminder_sent && (
            <Badge variant="outline" className="text-xs gap-1 py-0">
              <Bell className="h-2.5 w-2.5" />
              Reminder set
            </Badge>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => deleteTask.mutate({ id: task.id, prospectId })}
        disabled={deleteTask.isPending}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function ProspectTasksSection({ prospect }: ProspectTasksSectionProps) {
  const { data: tasks = [], isLoading } = useProspectTasks(prospect.id);
  const [addOpen, setAddOpen] = useState(false);

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              Tasks
              {activeTasks.length > 0 && (
                <Badge variant="secondary" className="ml-1">{activeTasks.length}</Badge>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tasks yet. Add a task to track to-dos for this prospect.
            </p>
          ) : (
            <div className="space-y-2">
              {activeTasks.map(task => (
                <TaskRow key={task.id} task={task} prospectId={prospect.id} />
              ))}
              {completedTasks.length > 0 && activeTasks.length > 0 && (
                <div className="border-t border-foreground/10 my-2" />
              )}
              {completedTasks.map(task => (
                <TaskRow key={task.id} task={task} prospectId={prospect.id} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TaskFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        prospectId={prospect.id}
      />
    </>
  );
}
