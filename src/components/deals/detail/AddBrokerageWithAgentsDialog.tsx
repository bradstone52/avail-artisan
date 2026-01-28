import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Plus, X } from 'lucide-react';
import { useCreateBrokerage } from '@/hooks/useBrokerages';
import { useCreateAgent } from '@/hooks/useAgents';
import { toast } from 'sonner';

interface AgentEntry {
  name: string;
  phone: string;
  email: string;
}

interface AddBrokerageWithAgentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBrokerageCreated: (brokerageId: string) => void;
}

export function AddBrokerageWithAgentsDialog({ open, onOpenChange, onBrokerageCreated }: AddBrokerageWithAgentsDialogProps) {
  const createBrokerage = useCreateBrokerage();
  const createAgent = useCreateAgent();

  const [brokerageName, setBrokerageName] = useState('');
  const [brokerageAddress, setBrokerageAddress] = useState('');
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const handleAddAgent = () => {
    setAgents([...agents, { name: '', phone: '', email: '' }]);
  };

  const handleRemoveAgent = (index: number) => {
    setAgents(agents.filter((_, i) => i !== index));
  };

  const handleAgentChange = (index: number, field: keyof AgentEntry, value: string) => {
    const updated = [...agents];
    updated[index] = { ...updated[index], [field]: value };
    setAgents(updated);
  };

  const handleSubmit = async () => {
    if (!brokerageName.trim()) {
      toast.error('Brokerage name is required');
      return;
    }

    setSaving(true);
    try {
      // Create the brokerage
      const brokerage = await createBrokerage.mutateAsync({
        name: brokerageName,
        address: brokerageAddress || null,
      });

      // Create agents if any
      for (const agent of agents) {
        if (agent.name.trim()) {
          await createAgent.mutateAsync({
            name: agent.name,
            phone: agent.phone || null,
            email: agent.email || null,
            brokerage_id: brokerage.id,
          });
        }
      }

      toast.success('Brokerage created successfully');
      onBrokerageCreated(brokerage.id);
      
      // Reset form
      setBrokerageName('');
      setBrokerageAddress('');
      setAgents([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating brokerage:', error);
      toast.error('Failed to create brokerage');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setBrokerageName('');
    setBrokerageAddress('');
    setAgents([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Brokerage</DialogTitle>
          <DialogDescription>
            Create a new brokerage and optionally add agents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Brokerage Name *</Label>
            <Input
              value={brokerageName}
              onChange={(e) => setBrokerageName(e.target.value)}
              placeholder="Enter brokerage name"
            />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={brokerageAddress}
              onChange={(e) => setBrokerageAddress(e.target.value)}
              placeholder="Enter address"
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Agents (Optional)</Label>
              <Button variant="outline" size="sm" onClick={handleAddAgent}>
                <Plus className="w-4 h-4 mr-1" /> Add Agent
              </Button>
            </div>

            {agents.map((agent, index) => (
              <div key={index} className="p-3 border rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Agent {index + 1}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveAgent(index)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={agent.name}
                      onChange={(e) => handleAgentChange(index, 'name', e.target.value)}
                      placeholder="Name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input
                      value={agent.phone}
                      onChange={(e) => handleAgentChange(index, 'phone', e.target.value)}
                      placeholder="Phone"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      value={agent.email}
                      onChange={(e) => handleAgentChange(index, 'email', e.target.value)}
                      placeholder="Email"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Creating...' : 'Create Brokerage'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
