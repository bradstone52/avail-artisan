import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserSearch, Edit } from 'lucide-react';
import { formatNumber, formatCurrency, formatDate } from '@/lib/format';
import type { Prospect } from '@/types/prospect';

interface ProspectViewCardProps {
  prospect: Prospect;
  onEdit?: () => void;
}

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
