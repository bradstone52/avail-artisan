import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserSearch, Edit, Phone, Mail, Clock } from 'lucide-react';
import { formatNumber, formatCurrency, formatDate } from '@/lib/format';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { Prospect } from '@/types/prospect';

interface ProspectViewCardProps {
  prospect: Prospect;
  onEdit?: () => void;
}

const priorityColors: Record<string, string> = {
  High: 'bg-red-100 text-red-800 hover:bg-red-100',
  Medium: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  Low: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
};

export function ProspectViewCard({ prospect, onEdit }: ProspectViewCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserSearch className="w-5 h-5" />
            Prospect Details
          </CardTitle>
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Name</p>
            <p className="font-medium">{prospect.name}</p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">Type</p>
            {prospect.prospect_type ? (
              <Badge 
                variant="secondary" 
                className="bg-amber-100 text-amber-800 hover:bg-amber-100"
              >
                {prospect.prospect_type}
              </Badge>
            ) : (
              <p className="font-medium">—</p>
            )}
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Priority</p>
            {prospect.priority ? (
              <Badge variant="secondary" className={priorityColors[prospect.priority] || ''}>
                {prospect.priority}
              </Badge>
            ) : (
              <p className="font-medium">—</p>
            )}
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Last Contacted</p>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="font-medium text-sm">
                {prospect.last_contacted_at
                  ? formatDistanceToNow(parseISO(prospect.last_contacted_at), { addSuffix: true })
                  : 'Never'}
              </p>
            </div>
          </div>

          {(prospect.phone || prospect.email) && (
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground mb-1">Contact</p>
              <div className="flex flex-wrap gap-3">
                {prospect.phone && (
                  <a
                    href={`tel:${prospect.phone}`}
                    className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {prospect.phone}
                  </a>
                )}
                {prospect.email && (
                  <a
                    href={`mailto:${prospect.email}`}
                    className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    {prospect.email}
                  </a>
                )}
              </div>
            </div>
          )}
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">Source</p>
            <p className="font-medium">{prospect.source || '—'}</p>
          </div>
          
          {prospect.referral && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Referral</p>
              <p className="font-medium">{prospect.referral}</p>
            </div>
          )}
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">Required Size (SF)</p>
            <p className="font-medium">{prospect.max_size ? formatNumber(prospect.max_size) : '—'}</p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">Loading</p>
            <p className="font-medium">{prospect.loading || '—'}</p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">Use Type</p>
            <p className="font-medium">{prospect.use_type || '—'}</p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">Yard Required</p>
            <p className="font-medium">{prospect.yard_required ? 'Yes' : 'No'}</p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">Occupancy Date</p>
            <p className="font-medium">{formatDate(prospect.occupancy_date)}</p>
          </div>
        </div>
        
        {/* Financial info */}
        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Estimated Value</p>
            <p className="font-medium">{formatCurrency(prospect.estimated_value)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Commission</p>
            <p className="font-medium">{formatCurrency(prospect.commission)}</p>
          </div>
        </div>
        
        {prospect.notes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{prospect.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
