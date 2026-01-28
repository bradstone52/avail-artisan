import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBrokerages } from '@/hooks/useBrokerages';
import { Building2, Save, Plus } from 'lucide-react';
import { AddAgentDialog } from './AddAgentDialog';
import type { Deal } from '@/types/database';

interface DealPartiesSectionProps {
  deal: Deal;
  onUpdate: (data: { id: string } & Partial<Deal>) => Promise<Deal>;
}

export function DealPartiesSection({ deal, onUpdate }: DealPartiesSectionProps) {
  const { data: brokerages } = useBrokerages();
  const [saving, setSaving] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    seller_name: deal.seller_name || '',
    seller_brokerage_id: deal.seller_brokerage_id || '',
    buyer_name: deal.buyer_name || '',
    buyer_brokerage_id: deal.buyer_brokerage_id || '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({ 
        id: deal.id, 
        seller_name: formData.seller_name || null,
        seller_brokerage_id: formData.seller_brokerage_id || null,
        buyer_name: formData.buyer_name || null,
        buyer_brokerage_id: formData.buyer_brokerage_id || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Seller Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Seller Name</Label>
            <Input
              value={formData.seller_name}
              onChange={(e) => setFormData({ ...formData, seller_name: e.target.value })}
              placeholder="Enter seller name"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Seller Brokerage</Label>
              <Button variant="ghost" size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add New
              </Button>
            </div>
            <Select
              value={formData.seller_brokerage_id}
              onValueChange={(value) => setFormData({ ...formData, seller_brokerage_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select brokerage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {brokerages?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Buyer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Buyer Name</Label>
            <Input
              value={formData.buyer_name}
              onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
              placeholder="Enter buyer name"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Buyer Brokerage</Label>
              <Button variant="ghost" size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add New
              </Button>
            </div>
            <Select
              value={formData.buyer_brokerage_id}
              onValueChange={(value) => setFormData({ ...formData, buyer_brokerage_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select brokerage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {brokerages?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AddAgentDialog 
        open={addDialogOpen} 
        onOpenChange={setAddDialogOpen}
        context="listing"
      />
    </>
  );
}
