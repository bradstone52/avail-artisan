import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAgents } from '@/hooks/useAgents';
import { useBrokerages } from '@/hooks/useBrokerages';
import { AddAgentDialog } from '@/components/deals/detail/AddAgentDialog';
import { Users, Save, Plus } from 'lucide-react';
import type { Deal } from '@/types/database';

interface DealAgentsSectionProps {
  deal: Deal;
  onUpdate: (data: { id: string } & Partial<Deal>) => Promise<Deal>;
}

export function DealAgentsSection({ deal, onUpdate }: DealAgentsSectionProps) {
  const { data: agents } = useAgents();
  const { data: brokerages } = useBrokerages();
  const [saving, setSaving] = useState(false);
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [addAgentContext, setAddAgentContext] = useState<'listing' | 'selling'>('listing');

  const [formData, setFormData] = useState({
    listing_brokerage_id: deal.listing_brokerage_id || '',
    listing_agent1_id: deal.listing_agent1_id || '',
    listing_agent2_id: deal.listing_agent2_id || '',
    selling_brokerage_id: deal.selling_brokerage_id || '',
    selling_agent1_id: deal.selling_agent1_id || '',
    selling_agent2_id: deal.selling_agent2_id || '',
    cv_agent_id: deal.cv_agent_id || '',
  });

  // Find ClearView brokerage
  const clearviewBrokerage = brokerages?.find(b => 
    b.name.toLowerCase().includes('clearview')
  );

  // Filter agents by brokerage
  const getAgentsForBrokerage = (brokerageId: string) => {
    if (!brokerageId || !agents) return [];
    return agents.filter(a => a.brokerage_id === brokerageId);
  };

  const cvAgents = clearviewBrokerage 
    ? agents?.filter(a => a.brokerage_id === clearviewBrokerage.id) || []
    : [];

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({ 
        id: deal.id, 
        listing_brokerage_id: formData.listing_brokerage_id || null,
        listing_agent1_id: formData.listing_agent1_id || null,
        listing_agent2_id: formData.listing_agent2_id || null,
        selling_brokerage_id: formData.selling_brokerage_id || null,
        selling_agent1_id: formData.selling_agent1_id || null,
        selling_agent2_id: formData.selling_agent2_id || null,
        cv_agent_id: formData.cv_agent_id || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const openAddAgent = (context: 'listing' | 'selling') => {
    setAddAgentContext(context);
    setAddAgentOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Listing Side
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Listing Brokerage</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => openAddAgent('listing')}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add New
              </Button>
            </div>
            <Select
              value={formData.listing_brokerage_id}
              onValueChange={(value) => setFormData({ 
                ...formData, 
                listing_brokerage_id: value,
                listing_agent1_id: '',
                listing_agent2_id: '',
              })}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Listing Agent 1</Label>
              <Select
                value={formData.listing_agent1_id}
                onValueChange={(value) => setFormData({ ...formData, listing_agent1_id: value })}
                disabled={!formData.listing_brokerage_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {getAgentsForBrokerage(formData.listing_brokerage_id).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Listing Agent 2</Label>
              <Select
                value={formData.listing_agent2_id}
                onValueChange={(value) => setFormData({ ...formData, listing_agent2_id: value })}
                disabled={!formData.listing_brokerage_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {getAgentsForBrokerage(formData.listing_brokerage_id).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Selling Side
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Selling Brokerage</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => openAddAgent('selling')}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add New
              </Button>
            </div>
            <Select
              value={formData.selling_brokerage_id}
              onValueChange={(value) => setFormData({ 
                ...formData, 
                selling_brokerage_id: value,
                selling_agent1_id: '',
                selling_agent2_id: '',
              })}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Selling Agent 1</Label>
              <Select
                value={formData.selling_agent1_id}
                onValueChange={(value) => setFormData({ ...formData, selling_agent1_id: value })}
                disabled={!formData.selling_brokerage_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {getAgentsForBrokerage(formData.selling_brokerage_id).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Selling Agent 2</Label>
              <Select
                value={formData.selling_agent2_id}
                onValueChange={(value) => setFormData({ ...formData, selling_agent2_id: value })}
                disabled={!formData.selling_brokerage_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {getAgentsForBrokerage(formData.selling_brokerage_id).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            ClearView Agent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>ClearView Commercial Realty Agent</Label>
            <Select
              value={formData.cv_agent_id}
              onValueChange={(value) => setFormData({ ...formData, cv_agent_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select CV agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {cvAgents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cvAgents.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No agents found under "ClearView Commercial Realty Inc." brokerage. Add agents in Contacts.
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AddAgentDialog 
        open={addAgentOpen} 
        onOpenChange={setAddAgentOpen}
        context={addAgentContext}
      />
    </>
  );
}
