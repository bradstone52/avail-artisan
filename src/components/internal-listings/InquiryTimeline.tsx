import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useInquiryTimeline,
  TIMELINE_EVENT_TYPES,
  TimelineEventFormData,
} from '@/hooks/useInternalListingInquiries';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { format } from 'date-fns';
import {
  Plus,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Users,
  FileText,
  ScrollText,
  MessageSquare,
  CircleDot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InquiryTimelineProps {
  inquiryId: string;
}

const eventIcons: Record<string, React.ElementType> = {
  Call: Phone,
  Email: Mail,
  Tour: MapPin,
  Meeting: Users,
  Offer: FileText,
  LOI: ScrollText,
  Note: MessageSquare,
  Other: CircleDot,
};

const eventColors: Record<string, string> = {
  Call: 'bg-blue-500',
  Email: 'bg-cyan-500',
  Tour: 'bg-amber-500',
  Meeting: 'bg-purple-500',
  Offer: 'bg-orange-500',
  LOI: 'bg-green-500',
  Note: 'bg-gray-500',
  Other: 'bg-gray-400',
};

export function InquiryTimeline({ inquiryId }: InquiryTimelineProps) {
  const { events, isLoading, addEvent, deleteEvent } = useInquiryTimeline(inquiryId);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TimelineEventFormData>({
    event_type: 'Call',
    notes: '',
    event_date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addEvent.mutate(
      {
        inquiry_id: inquiryId,
        ...formData,
        event_date: formData.event_date
          ? new Date(formData.event_date).toISOString()
          : undefined,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setFormData({
            event_type: 'Call',
            notes: '',
            event_date: new Date().toISOString().split('T')[0],
          });
        },
      }
    );
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteEvent.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading activity...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Activity Timeline</h4>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-3 w-3" />
          Add Event
        </Button>
      </div>

      {/* Add Event Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-3 bg-muted/50 rounded-lg space-y-2 border"
        >
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={formData.event_type}
              onValueChange={(value) =>
                setFormData({ ...formData, event_type: value })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMELINE_EVENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type} className="text-xs">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={formData.event_date}
              onChange={(e) =>
                setFormData({ ...formData, event_date: e.target.value })
              }
              className="h-8 text-xs"
            />
          </div>
          <Textarea
            placeholder="Notes (optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            className="text-xs"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-7 text-xs"
              disabled={addEvent.isPending}
            >
              Add
            </Button>
          </div>
        </form>
      )}

      {/* Timeline */}
      {events.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          No activity recorded yet
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => {
            const Icon = eventIcons[event.event_type] || CircleDot;
            return (
              <div
                key={event.id}
                className="flex items-start gap-2 group"
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                    eventColors[event.event_type] || 'bg-gray-400'
                  )}
                >
                  <Icon className="h-3 w-3 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{event.event_type}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(event.event_date), 'MMM d, yyyy')}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                      onClick={() => setDeleteId(event.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                  {event.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {event.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Event"
        description="Are you sure you want to delete this timeline event?"
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
