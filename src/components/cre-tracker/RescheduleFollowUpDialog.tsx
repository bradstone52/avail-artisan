import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface RescheduleFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId: string;
  prospectName: string;
  currentDate: string; // YYYY-MM-DD
}

export function RescheduleFollowUpDialog({
  open,
  onOpenChange,
  prospectId,
  prospectName,
  currentDate,
}: RescheduleFollowUpDialogProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [notes, setNotes] = React.useState('');
  const queryClient = useQueryClient();

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedDate(undefined);
      setNotes('');
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: async ({ date, notes }: { date: string; notes: string }) => {
      // Update the prospect's follow_up_date directly
      const updatePayload: Record<string, string | null> = { follow_up_date: date };
      if (notes.trim()) {
        // Append reschedule note to existing notes
        const { data: prospect } = await supabase
          .from('prospects')
          .select('notes')
          .eq('id', prospectId)
          .single();

        const existingNotes = prospect?.notes || '';
        const rescheduleNote = `[Rescheduled ${format(new Date(), 'MMM d')}] ${notes.trim()}`;
        updatePayload.notes = existingNotes
          ? `${existingNotes}\n${rescheduleNote}`
          : rescheduleNote;
      }

      const { error } = await supabase
        .from('prospects')
        .update(updatePayload)
        .eq('id', prospectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['prospect-follow-up-dates', prospectId] });
      queryClient.invalidateQueries({ queryKey: ['deal-important-dates'] });
      toast.success('Follow-up rescheduled');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error rescheduling follow-up:', error);
      toast.error('Failed to reschedule follow-up');
    },
  });

  const handleSave = () => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    mutation.mutate({ date: dateStr, notes });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Reschedule Follow-up</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Rescheduling follow-up for <span className="font-medium text-foreground">{prospectName}</span>
          </p>

          <div className="space-y-2">
            <Label>New date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Reason for rescheduling..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!selectedDate || mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
