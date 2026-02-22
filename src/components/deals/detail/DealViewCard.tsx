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
import { useAgents } from '@/hooks/useAgents';
import { useBrokerages } from '@/hooks/useBrokerages';
import type { Deal } from '@/types/database';

interface DealViewCardProps {
  deal: Deal;
  onEdit?: () => void;
}

const DEAL_STATUSES = ['Conditional', 'Firm', 'Closed'];

export function DealViewCard({ deal, onEdit }: DealViewCardProps) {
  const queryClient = useQueryClient();
  const { data: agents } = useAgents();
  const { data: brokerages } = useBrokerages();

  const formatNumber = (num: number | null | undefined) => {
    if (!num) return '—';
    return num.toLocaleString();
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '—';
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    return `${value}%`;
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return format(new Date(dateStr + 'T00:00:00'), 'MMM d, yyyy');
  };

  const getAgentName = (id: string | null | undefined) => {
    if (!id || !agents) return '—';
    return agents.find(a => a.id === id)?.name || '—';
  };

  const getBrokerageName = (id: string | null | undefined) => {
    if (!id || !brokerages) return '—';
    return brokerages.find(b => b.id === id)?.name || '—';
  };

  // Fetch linked property if listing_id exists
  const { data: linkedProperty } = useQuery({
    queryKey: ['linked-property', deal.listing_id],
    queryFn: async () => {
      if (!deal.listing_id) return null;
      const { data: listing } = await supabase
        .from('market_listings')
        .select('address')
        .eq('id', deal.listing_id)
        .single();
      if (!listing) return null;
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

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <div className="text-sm font-medium text-right truncate">{children}</div>
    </div>
  );

  const hasParties = deal.seller_name || deal.buyer_name || deal.seller_brokerage_id || deal.buyer_brokerage_id;
  const hasAgents = deal.listing_brokerage_id || deal.selling_brokerage_id || deal.cv_agent_id;
  const hasFinancials = deal.commission_percent || deal.other_brokerage_percent || deal.clearview_percent;

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
      <CardContent className="space-y-2 p-4 pt-0">
        {/* Core fields */}
        <div className="rounded-md bg-muted/40 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Overview</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0">
            <Field label="Type">
              <Badge variant="secondary" className="bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs">
                {deal.deal_type || 'Lease'}
              </Badge>
            </Field>
            <Field label="Status">
              <Select value={deal.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[140px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {DEAL_STATUSES.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Address">{deal.address}</Field>
            {deal.deal_number && <Field label="Deal Number">{deal.deal_number}</Field>}
            <Field label="City">{deal.city || '—'}</Field>
            <Field label="Submarket">{deal.submarket || '—'}</Field>
            <Field label={deal.is_land_deal ? 'Size (Ac)' : 'Size (SF)'}>{formatNumber(deal.size_sf)}</Field>
            <Field label="Deal Value">{formatCurrency(deal.deal_value)}</Field>
            <Field label="Close Date">{formatDate(deal.close_date)}</Field>
            <Field label="Effective Date">{formatDate((deal as any).effective_date)}</Field>
          </div>
        </div>

        {/* Parties */}
        {hasParties && (
          <div className="rounded-md bg-accent/30 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Parties</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0">
              <Field label="Vendor / Seller">{deal.seller_name || '—'}</Field>
              <Field label="Purchaser / Buyer">{deal.buyer_name || '—'}</Field>
              <Field label="Seller Brokerage">{getBrokerageName(deal.seller_brokerage_id)}</Field>
              <Field label="Buyer Brokerage">{getBrokerageName(deal.buyer_brokerage_id)}</Field>
            </div>
          </div>
        )}

        {/* Agents */}
        {hasAgents && (
          <div className="rounded-md bg-muted/40 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Agents</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0">
              {deal.listing_brokerage_id && (
                <>
                  <Field label="Listing Brokerage">{getBrokerageName(deal.listing_brokerage_id)}</Field>
                  <div />
                  <Field label="Listing Agent 1">{getAgentName(deal.listing_agent1_id)}</Field>
                  <Field label="Listing Agent 2">{getAgentName(deal.listing_agent2_id)}</Field>
                </>
              )}
              {deal.selling_brokerage_id && (
                <>
                  <Field label="Selling Brokerage">{getBrokerageName(deal.selling_brokerage_id)}</Field>
                  <div />
                  <Field label="Selling Agent 1">{getAgentName(deal.selling_agent1_id)}</Field>
                  <Field label="Selling Agent 2">{getAgentName(deal.selling_agent2_id)}</Field>
                </>
              )}
              {deal.cv_agent_id && (
                <Field label="ClearView Agent">{getAgentName(deal.cv_agent_id)}</Field>
              )}
            </div>
          </div>
        )}

        {/* Commission Split */}
        {hasFinancials && (
          <div className="rounded-md bg-accent/30 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Commission</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0">
              <Field label="Commission Rate">{formatPercent(deal.commission_percent)}</Field>
              <Field label="GST Rate">{formatPercent(deal.gst_rate)}</Field>
              <Field label="Other Brokerage %">{formatPercent(deal.other_brokerage_percent)}</Field>
              <Field label="ClearView %">{formatPercent(deal.clearview_percent)}</Field>
            </div>
          </div>
        )}

        {/* Linked Property */}
        {linkedProperty && (
          <div className="rounded-md bg-muted/40 p-3">
            <Field label="Linked Property">
              <Button variant="link" className="p-0 h-auto text-xs" asChild>
                <Link to={`/properties/${linkedProperty.id}`} className="flex items-center gap-1 text-primary">
                  {linkedProperty.name || linkedProperty.address}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </Button>
            </Field>
          </div>
        )}

        {/* Notes */}
        {deal.notes && (
          <div className="rounded-md bg-accent/30 p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Notes</p>
            <p className="text-xs">{deal.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
