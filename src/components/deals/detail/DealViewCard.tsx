import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Deal } from '@/types/database';

interface DealViewCardProps {
  deal: Deal;
}

export function DealViewCard({ deal }: DealViewCardProps) {
  const formatNumber = (num: number | null | undefined) => {
    if (!num) return '—';
    return num.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Deal Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Type</p>
            <Badge 
              variant="secondary" 
              className="bg-amber-100 text-amber-800 hover:bg-amber-100"
            >
              {deal.deal_type || 'Lease'}
            </Badge>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">Address</p>
            <p className="font-medium">{deal.address}</p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">Size (SF)</p>
            <p className="font-medium">{formatNumber(deal.size_sf)}</p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">City</p>
            <p className="font-medium">{deal.city || '—'}</p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">Submarket</p>
            <p className="font-medium">{deal.submarket || '—'}</p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">Close Date</p>
            <p className="font-medium">
              {deal.close_date ? format(new Date(deal.close_date), 'MMM d, yyyy') : '—'}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">Status</p>
            <Badge 
              variant={deal.status === 'Closed' ? 'default' : deal.status === 'Lost' ? 'destructive' : 'secondary'}
            >
              {deal.status}
            </Badge>
          </div>
          
          {deal.deal_number && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Deal Number</p>
              <p className="font-medium">{deal.deal_number}</p>
            </div>
          )}
        </div>
        
        {deal.notes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{deal.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
