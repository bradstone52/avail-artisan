import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Save } from 'lucide-react';
import type { Deal, DealType, DealStatus } from '@/types/database';

interface DealBasicSectionProps {
  deal: Deal;
  onUpdate: (data: { id: string } & Partial<Deal>) => Promise<Deal>;
}

const dealTypes: DealType[] = ['Lease', 'Sale', 'Sublease', 'Renewal', 'Expansion'];
const dealStatuses: DealStatus[] = ['Active', 'Under Contract', 'Closed', 'Lost', 'On Hold'];

export function DealBasicSection({ deal, onUpdate }: DealBasicSectionProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    deal_number: deal.deal_number || '',
    deal_type: deal.deal_type as DealType,
    status: deal.status as DealStatus,
    notes: deal.notes || '',
  });

  const hasLinkedListing = !!deal.listing_id;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({ id: deal.id, ...formData });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Basic Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Deal Number</Label>
            <Input
              value={formData.deal_number}
              onChange={(e) => setFormData({ ...formData, deal_number: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label>Deal Type</Label>
            <Input
              value={deal.deal_type}
              disabled
              className="bg-muted"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Address</Label>
          <Input value={deal.address} disabled className="bg-muted" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>City</Label>
            <Input value={deal.city || ''} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Submarket</Label>
            <Input value={deal.submarket || ''} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Size ({(deal as any).is_land_deal ? 'Ac' : 'SF'})</Label>
            <Input 
              value={deal.size_sf?.toLocaleString() || '—'} 
              disabled 
              className="bg-muted" 
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value as DealStatus })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dealStatuses.map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Notes / Comments</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            placeholder="Add notes about this deal..."
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
