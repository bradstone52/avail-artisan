import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, ExternalLink, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Deal } from '@/types/database';

interface DealViewCardProps {
  deal: Deal;
  onEdit?: () => void;
}

const DEAL_STATUSES = ['Conditional', 'Firm', 'Closed'];

export function DealViewCard({ deal, onEdit }: DealViewCardProps) {
  const queryClient = useQueryClient();

  const formatNumber = (num: number | null | undefined) => {
    if (!num) return '—';
    return num.toLocaleString();
  };

  // Fetch linked property if listing_id exists
  const { data: linkedProperty } = useQuery({
    queryKey: ['linked-property', deal.listing_id],
    queryFn: async () => {
      if (!deal.listing_id) return null;
      
      // First get the market listing
      const { data: listing } = await supabase
        .from('market_listings')
        .select('address')
        .eq('id', deal.listing_id)
        .single();
      
      if (!listing) return null;
      
      // Find matching property by address
      const { data: property } = await supabase
        .from('properties')
        .select('id, name, address')
        .ilike('address', listing.address)
        .maybeSingle();
      
      return property;
    },
    enabled: !!deal.listing_id,
  });

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('deals')
        .update({ status: newStatus })
        .eq('id', deal.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals', deal.id] });
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Deal Details
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
            <Select value={deal.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {DEAL_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {deal.deal_number && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Deal Number</p>
              <p className="font-medium">{deal.deal_number}</p>
            </div>
          )}
        </div>
        
        {linkedProperty && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-1">Linked Property</p>
            <Button variant="link" className="p-0 h-auto" asChild>
              <Link to={`/properties/${linkedProperty.id}`} className="flex items-center gap-1 text-primary">
                {linkedProperty.name || linkedProperty.address}
                <ExternalLink className="w-3 h-3" />
              </Link>
            </Button>
          </div>
        )}
        
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
