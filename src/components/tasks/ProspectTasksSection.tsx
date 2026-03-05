import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trash2, Bell, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { formatDate } from '@/lib/format';
import { differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  useToggleProspectTaskCompleted,
  useDeleteProspectTask,
} from '@/hooks/useProspectTasks';
import { TaskFormDialog } from '@/components/prospects/TaskFormDialog';
import type { ProspectTask } from '@/types/prospect';

type FilterMode = 'all' | 'mine' | 'incomplete';

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

function AssigneeChip({ userId, members }: { userId: string | null | undefined; members: { id: string; full_name: string | null }[] }) {
  if (!userId) return <span className="text-xs text-muted-foreground">—</span>;
  const member = members.find((m) => m.id === userId);
  const name = member?.full_name ?? '?';
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Avatar className="h-4 w-4">
        <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
      </Avatar>
      {name}
    </span>
  );
}

function useAllOrgProspectTasks() {
  const { org } = useOrg();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['prospect_tasks_all_org', org?.id],
    queryFn: async () => {
      if (!org?.id) return [] as (ProspectTask & { prospect_name?: string })[];
      // fetch all tasks joined with prospect name
      const { data, error } = await (supabase as any)
        .from('prospect_tasks')
        .select('*, prospects!inner(id, name, org_id)')
        .eq('prospects.org_id', org.id)
        .order('completed', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        prospect_name: row.prospects?.name ?? '',
        prospect_id: row.prospect_id,
      })) as (ProspectTask & { prospect_name?: string })[];
    },
    enabled: !!user && !!org?.id,
  });
}

function useOrgMemberProfiles() {
  const { org } = useOrg();
  return useQuery({
    queryKey: ['org_members_profiles', org?.id],
    queryFn: async () => {
      if (!org?.id) return [] as { id: string; full_name: string | null }[];
      const { data } = await supabase
        .from('org_members')
        .select('user_id, profiles(id, full_name)')
        .eq('org_id', org.id);
      return ((data ?? []).map((m: any) => m.profiles).filter(Boolean)) as { id: string; full_name: string | null }[];
    },
    enabled: !!org?.id,
  });
}

function ProspectTaskRow({
  task,
  members,
  onEdit,
}: {
  task: ProspectTask & { prospect_name?: string };
  members: { id: string; full_name: string | null }[];
  onEdit: (task: ProspectTask) => void;
}) {
  const toggle = useToggleProspectTaskCompleted();
  const deleteTask = useDeleteProspectTask();

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
          onCheckedChange={(checked) =>
            toggle.mutate({ id: task.id, prospectId: task.prospect_id, completed: checked === true })
          }
          className="h-4 w-4 border-2"
        />
      </td>
      <td className="px-3 py-2.5 text-sm font-medium max-w-0 w-full">
        <span className={cn(task.completed && 'line-through text-muted-foreground')}>{task.title}</span>
        {task.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.notes}</p>
        )}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <Link
          to={`/prospects/${task.prospect_id}`}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {task.prospect_name ?? '—'}
          <ExternalLink className="h-3 w-3" />
        </Link>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <DueDatePill date={task.due_date} />
      </td>
      <td className="px-3 py-2.5">
        <AssigneeChip userId={task.assigned_to} members={members} />
      </td>
      <td className="px-3 py-2.5">
        {task.reminder_at && !task.reminder_sent && (
          <Badge variant="outline" className="text-xs gap-1 py-0 border-amber-300 text-amber-600">
            <Bell className="h-2.5 w-2.5" />
            Set
          </Badge>
        )}
      </td>
      <td className="pr-3 py-2.5">
        <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); deleteTask.mutate({ id: task.id, prospectId: task.prospect_id }); }}
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

export function ProspectTasksSection() {
  const { data: tasks = [], isLoading } = useAllOrgProspectTasks();
  const { data: members = [] } = useOrgMemberProfiles();
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterMode>('incomplete');
  const [editTask, setEditTask] = useState<ProspectTask | undefined>();

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filter === 'mine') return t.assigned_to === user?.id && !t.completed;
      if (filter === 'incomplete') return !t.completed;
      return true;
    });
  }, [tasks, filter, user?.id]);

  const activeTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">Prospect Tasks</h3>
          {activeTasks.length > 0 && (
            <Badge variant="secondary">{activeTasks.length}</Badge>
          )}
        </div>
        <div className="flex gap-1">
          {(['all', 'mine', 'incomplete'] as FilterMode[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2.5 text-xs capitalize"
              onClick={() => setFilter(f)}
            >
              {f === 'incomplete' ? 'Incomplete' : f === 'mine' ? 'Assigned to me' : 'All'}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading tasks...</p>
      ) : filteredTasks.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-8 text-center">
          <p className="text-sm text-muted-foreground">No prospect tasks matching this filter.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                <th className="pl-4 pr-2 py-2 w-8" />
                <th className="px-3 py-2 text-left font-semibold text-foreground">Task</th>
                <th className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">Prospect</th>
                <th className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">Due Date</th>
                <th className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">Assigned To</th>
                <th className="px-3 py-2 text-left font-semibold text-foreground">Reminder</th>
                <th className="pr-3 py-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {activeTasks.map((task) => (
                <ProspectTaskRow key={task.id} task={task} members={members} onEdit={setEditTask} />
              ))}
              {completedTasks.length > 0 && activeTasks.length > 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-1.5 bg-muted/30">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed</span>
                  </td>
                </tr>
              )}
              {completedTasks.map((task) => (
                <ProspectTaskRow key={task.id} task={task} members={members} onEdit={setEditTask} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editTask && (
        <TaskFormDialog
          open={!!editTask}
          onOpenChange={(open) => { if (!open) setEditTask(undefined); }}
          prospectId={editTask.prospect_id}
          task={editTask}
        />
      )}
    </div>
  );
}
