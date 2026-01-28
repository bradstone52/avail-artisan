import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { ProspectFollowUpDate } from '@/hooks/useProspectFollowUpDates';

interface FollowUpDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { date: string; notes?: string }) => void;
  initialData?: ProspectFollowUpDate | null;
  isLoading?: boolean;
}

export function FollowUpDateDialog({
  open,
  onOpenChange,
  onSave,
  initialData,
  isLoading,
}: FollowUpDateDialogProps) {
  const [date, setDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      if (initialData) {
        setDate(parseISO(initialData.date));
        setNotes(initialData.notes || '');
      } else {
        setDate(undefined);
        setNotes('');
      }
    }
  }, [open, initialData]);

  const handleSave = () => {
    if (!date) return;
    onSave({
      date: format(date, 'yyyy-MM-dd'),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Follow-up Date' : 'Add Follow-up Date'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this follow-up..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!date || isLoading}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
