import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InternalListingInquiry, INQUIRY_STAGES } from '@/hooks/useInternalListingInquiries';
import { InquiryTimeline } from './InquiryTimeline';
import { format } from 'date-fns';
import {
  MoreVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Building2,
  Calendar,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InquiryCardProps {
  inquiry: InternalListingInquiry;
  onEdit: () => void;
  onDelete: () => void;
  onStageChange: (stage: string) => void;
}

const stageColors: Record<string, string> = {
  New: 'bg-blue-100 text-blue-800 border-blue-300',
  Contacted: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  'Tour Booked': 'bg-amber-100 text-amber-800 border-amber-300',
  'Tour Completed': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Offer Sent': 'bg-orange-100 text-orange-800 border-orange-300',
  'LOI Pending': 'bg-purple-100 text-purple-800 border-purple-300',
  Completed: 'bg-green-100 text-green-800 border-green-300',
  Lost: 'bg-gray-100 text-gray-500 border-gray-300',
};

export function InquiryCard({
  inquiry,
  onEdit,
  onDelete,
  onStageChange,
}: InquiryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isOverdue =
    inquiry.next_follow_up && new Date(inquiry.next_follow_up) < new Date();

  return (
    <Card className="border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))]">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-lg truncate">{inquiry.contact_name}</h3>
              <Badge
                variant="outline"
                className={cn('text-xs border', stageColors[inquiry.stage])}
              >
                {inquiry.stage}
              </Badge>
            </div>
            {inquiry.contact_company && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Building2 className="h-3 w-3" />
                {inquiry.contact_company}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Contact Details */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {inquiry.contact_email && (
            <a
              href={`mailto:${inquiry.contact_email}`}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <Mail className="h-3 w-3" />
              {inquiry.contact_email}
            </a>
          )}
          {inquiry.contact_phone && (
            <a
              href={`tel:${inquiry.contact_phone}`}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <Phone className="h-3 w-3" />
              {inquiry.contact_phone}
            </a>
          )}
        </div>

        {/* Quick Info Row */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            Source: <span className="font-medium text-foreground">{inquiry.source}</span>
          </span>
          {inquiry.assigned_broker && (
            <span className="text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              {inquiry.assigned_broker.name}
            </span>
          )}
          {inquiry.next_follow_up && (
            <span
              className={cn(
                'flex items-center gap-1',
                isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'
              )}
            >
              <Calendar className="h-3 w-3" />
              Follow-up: {format(new Date(inquiry.next_follow_up), 'MMM d')}
              {isOverdue && ' (Overdue)'}
            </span>
          )}
        </div>

        {/* Stage Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Move to:</span>
          <Select value={inquiry.stage} onValueChange={onStageChange}>
            <SelectTrigger className="h-7 text-xs w-auto min-w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INQUIRY_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage} className="text-xs">
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes Preview */}
        {inquiry.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded">
            {inquiry.notes}
          </p>
        )}

        {/* Expand/Collapse Timeline */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-2"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Hide Activity
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show Activity
            </>
          )}
        </Button>

        {expanded && (
          <div className="pt-2 border-t">
            <InquiryTimeline inquiryId={inquiry.id} />
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-right">
          Created {format(new Date(inquiry.created_at), 'MMM d, yyyy')}
        </p>
      </CardContent>
    </Card>
  );
}
