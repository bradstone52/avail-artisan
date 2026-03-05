import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Bell, BellOff, Pencil } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  useUserTasks,
  useToggleUserTaskCompleted,
  useDeleteUserTask,
  useSetUserTaskReminder,
} from '@/hooks/useUserTasks';
import { UserTaskFormDialog } from './UserTaskFormDialog';
import type { UserTask } from '@/types/tasks';

function DueDatePill({ date }: { date?: string | null }) {
  if (!date) return null;
  const d = parseISO(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = differenceInDays(d, today);

  if (days < 0)
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive">
        Overdue
      </span>
    );
  if (days === 0)
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning-foreground">
        Due today
      </span>
    );
  if (days <= 3)
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
        Due {formatDate(date)}
      </span>
    );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
      {formatDate(date)}
    </span>
  );
}

function TaskReminderPopover({ task }: { task: UserTask }) {
  const setReminder = useSetUserTaskReminder();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const hasActiveReminder = !!task.reminder_at && !task.reminder_sent;

  const handleSet = async () => {
    if (!value) return;
    await setReminder.mutateAsync({ id: task.id, reminderAt: new Date(value).toISOString() });
    setOpen(false);
    setValue('');
  };

  const handleClear = async () => {
    await setReminder.mutateAsync({ id: task.id, reminderAt: null });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7 shrink-0',
            hasActiveReminder ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground hover:text-foreground',
          )}
          title={hasActiveReminder ? 'Reminder set — click to change' : 'Set reminder'}
          onClick={(e) => e.stopPropagation()}
        >
          <Bell className={cn('h-3.5 w-3.5', hasActiveReminder && 'fill-current')} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold">Set Email Reminder</p>
            {task.reminder_sent && <p className="text-xs text-muted-foreground mt-0.5">Previous reminder was already sent.</p>}
            {hasActiveReminder && task.reminder_at && (
              <p className="text-xs text-amber-600 mt-0.5">
                Active: {new Date(task.reminder_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">New reminder date & time</Label>
            <Input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} className="text-xs" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={handleSet} disabled={!value || setReminder.isPending}>
              Set Reminder
            </Button>
            {hasActiveReminder && (
              <Button size="sm" variant="outline" onClick={handleClear} disabled={setReminder.isPending} title="Clear reminder">
                <BellOff className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PersonalTaskRow({
  task,
  onEdit,
}: {
  task: UserTask;
  onEdit: (task: UserTask) => void;
}) {
  const toggle = useToggleUserTaskCompleted();
  const deleteTask = useDeleteUserTask();

  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, a, label, [role="checkbox"]')) return;
    onEdit(task);
  };

  return (
    <tr
      className={cn(
        'group border-b border-border/50 hover:bg-accent/40 cursor-pointer transition-colors',
        task.completed && 'opacity-50',
      )}
      onDoubleClick={handleDoubleClick}
    >
      <td className="pl-4 pr-2 py-2.5 w-8">
        <Checkbox
          checked={task.completed}
          onCheckedChange={(checked) => toggle.mutate({ id: task.id, completed: checked === true })}
          className="h-4 w-4 border-2"
        />
      </td>
      <td className="px-3 py-2.5 text-sm font-medium">
        <span className={cn(task.completed && 'line-through text-muted-foreground')}>{task.title}</span>
        {task.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.notes}</p>
        )}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <DueDatePill date={task.due_date} />
      </td>
      <td className="px-3 py-2.5">
        {task.reminder_at && !task.reminder_sent && (
          <Badge variant="outline" className="text-xs gap-1 py-0 border-amber-300 text-amber-600">
            <Bell className="h-2.5 w-2.5" />
            Reminder set
          </Badge>
        )}
        {task.reminder_sent && (
          <Badge variant="outline" className="text-xs gap-1 py-0 text-muted-foreground">
            <Bell className="h-2.5 w-2.5" />
            Sent
          </Badge>
        )}
      </td>
      <td className="pr-3 py-2.5">
        <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            title="Edit task"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <TaskReminderPopover task={task} />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); deleteTask.mutate(task.id); }}
            disabled={deleteTask.isPending}
            title="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function PersonalTasksSection() {
  const { data: tasks = [], isLoading } = useUserTasks();
  const [addOpen, setAddOpen] = useState(false);
  const [editTask, setEditTask] = useState<UserTask | undefined>();

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">My Personal Tasks</h3>
          {activeTasks.length > 0 && (
            <Badge variant="secondary">{activeTasks.length}</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add Task
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-8 text-center">
          <p className="text-sm text-muted-foreground">No personal tasks yet.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add your first task
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                <th className="pl-4 pr-2 py-2 w-8" />
                <th className="px-3 py-2 text-left font-semibold text-foreground">Task</th>
                <th className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">Due Date</th>
                <th className="px-3 py-2 text-left font-semibold text-foreground">Reminder</th>
                <th className="pr-3 py-2 w-28" />
              </tr>
            </thead>
            <tbody>
              {activeTasks.map((task) => (
                <PersonalTaskRow key={task.id} task={task} onEdit={setEditTask} />
              ))}
              {completedTasks.length > 0 && activeTasks.length > 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-1.5 bg-muted/30">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed</span>
                  </td>
                </tr>
              )}
              {completedTasks.map((task) => (
                <PersonalTaskRow key={task.id} task={task} onEdit={setEditTask} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UserTaskFormDialog open={addOpen} onOpenChange={setAddOpen} />
      <UserTaskFormDialog open={!!editTask} onOpenChange={(open) => { if (!open) setEditTask(undefined); }} task={editTask} />
    </div>
  );
}
