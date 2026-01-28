import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { differenceInDays, parseISO, isPast, isToday } from 'date-fns';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { FollowUpDateDialog } from './FollowUpDateDialog';
import {
  useProspectFollowUpDates,
  useCreateFollowUpDate,
  useUpdateFollowUpDate,
  useDeleteFollowUpDate,
  useToggleFollowUpDateCompleted,
  type ProspectFollowUpDate,
} from '@/hooks/useProspectFollowUpDates';
import type { Prospect } from '@/types/prospect';

interface FollowUpDatesSectionProps {
  prospect: Prospect;
}

export function FollowUpDatesSection({ prospect }: FollowUpDatesSectionProps) {
  const { data: followUpDates = [], isLoading } = useProspectFollowUpDates(prospect.id);
  const createMutation = useCreateFollowUpDate();
  const updateMutation = useUpdateFollowUpDate();
  const deleteMutation = useDeleteFollowUpDate();
  const toggleMutation = useToggleFollowUpDateCompleted();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<ProspectFollowUpDate | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [dateToDelete, setDateToDelete] = useState<ProspectFollowUpDate | null>(null);

  const handleAdd = () => {
    setEditingDate(null);
    setDialogOpen(true);
  };

  const handleEdit = (date: ProspectFollowUpDate) => {
    setEditingDate(date);
    setDialogOpen(true);
  };

  const handleSave = async (data: { date: string; notes?: string }) => {
    if (editingDate) {
      await updateMutation.mutateAsync({
        id: editingDate.id,
        prospectId: prospect.id,
        ...data,
        completed: editingDate.completed,
      });
    } else {
      await createMutation.mutateAsync({
        prospectId: prospect.id,
        ...data,
      });
    }
    setDialogOpen(false);
  };

  const handleDeleteClick = (date: ProspectFollowUpDate) => {
    setDateToDelete(date);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!dateToDelete) return;
    await deleteMutation.mutateAsync({
      id: dateToDelete.id,
      prospectId: prospect.id,
    });
    setDeleteConfirmOpen(false);
    setDateToDelete(null);
  };

  const handleToggleCompleted = (date: ProspectFollowUpDate) => {
    toggleMutation.mutate({
      id: date.id,
      prospectId: prospect.id,
      completed: !date.completed,
    });
  };

  const getDateStatus = (dateStr: string, completed: boolean) => {
    if (completed) return { variant: 'secondary' as const, label: 'Completed', className: 'bg-green-100 text-green-800' };
    
    const date = parseISO(dateStr);
    if (isPast(date) && !isToday(date)) {
      return { variant: 'destructive' as const, label: 'Overdue', className: '' };
    }
    if (isToday(date)) {
      return { variant: 'secondary' as const, label: 'Today', className: 'bg-yellow-100 text-yellow-800' };
    }
    const daysUntil = differenceInDays(date, new Date());
    if (daysUntil <= 3) {
      return { variant: 'secondary' as const, label: `${daysUntil} days`, className: 'bg-yellow-100 text-yellow-800' };
    }
    return { variant: 'outline' as const, label: `${daysUntil} days`, className: '' };
  };

  const getRowClassName = (dateStr: string, completed: boolean) => {
    if (completed) return 'bg-muted/30 opacity-75';
    
    const date = parseISO(dateStr);
    if (isPast(date) && !isToday(date)) {
      return 'bg-destructive/10 border-destructive/30';
    }
    if (isToday(date) || differenceInDays(date, new Date()) <= 3) {
      return 'bg-yellow-50 border-yellow-200';
    }
    return 'bg-muted/50';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Follow-up Dates
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add Date
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : followUpDates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No follow-up dates scheduled
            </p>
          ) : (
            <div className="space-y-2">
              {followUpDates.map((date) => {
                const status = getDateStatus(date.date, date.completed);
                const isPastDate = isPast(parseISO(date.date)) && !isToday(parseISO(date.date)) && !date.completed;
                
                return (
                  <div
                    key={date.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${getRowClassName(date.date, date.completed)}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Checkbox
                        checked={date.completed}
                        onCheckedChange={() => handleToggleCompleted(date)}
                      />
                      {isPastDate && (
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium ${date.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {formatDate(date.date)}
                        </p>
                        {date.notes && (
                          <p className="text-sm text-muted-foreground truncate">
                            {date.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={status.variant} className={status.className}>
                        {status.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(date)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(date)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <FollowUpDateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        initialData={editingDate}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Remove Follow-up Date"
        description={`Are you sure you want to remove the follow-up date for ${dateToDelete ? formatDate(dateToDelete.date) : ''}?`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
