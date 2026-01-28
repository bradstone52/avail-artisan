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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBrokerages, useCreateBrokerage } from '@/hooks/useBrokerages';
import { useCreateAgent } from '@/hooks/useAgents';
import { Plus, Building2, User } from 'lucide-react';

interface AddAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: 'listing' | 'selling';
}

interface AgentForm {
  name: string;
  phone: string;
  email: string;
}

export function AddAgentDialog({ open, onOpenChange, context }: AddAgentDialogProps) {
  const { data: brokerages } = useBrokerages();
  const createBrokerage = useCreateBrokerage();
  const createAgent = useCreateAgent();

  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new');
  
  // New brokerage form
  const [newBrokerage, setNewBrokerage] = useState({
    name: '',
    address: '',
  });
  const [newBrokerageAgents, setNewBrokerageAgents] = useState<AgentForm[]>([
    { name: '', phone: '', email: '' }
  ]);

  // Existing brokerage form
  const [selectedBrokerageId, setSelectedBrokerageId] = useState('');
  const [existingAgentForm, setExistingAgentForm] = useState<AgentForm>({
    name: '',
    phone: '',
    email: '',
  });

  const addAgentRow = () => {
    setNewBrokerageAgents([...newBrokerageAgents, { name: '', phone: '', email: '' }]);
  };

  const updateAgentRow = (index: number, field: keyof AgentForm, value: string) => {
    const updated = [...newBrokerageAgents];
    updated[index] = { ...updated[index], [field]: value };
    setNewBrokerageAgents(updated);
  };

  const removeAgentRow = (index: number) => {
    if (newBrokerageAgents.length > 1) {
      setNewBrokerageAgents(newBrokerageAgents.filter((_, i) => i !== index));
    }
  };

  const handleSaveNewBrokerage = async () => {
    if (!newBrokerage.name) return;

    try {
      const brokerage = await createBrokerage.mutateAsync({
        name: newBrokerage.name,
        address: newBrokerage.address || undefined,
      });

      // Create agents for this brokerage
      for (const agent of newBrokerageAgents) {
        if (agent.name) {
          await createAgent.mutateAsync({
            name: agent.name,
            phone: agent.phone || undefined,
            email: agent.email || undefined,
            brokerage_id: brokerage.id,
          });
        }
      }

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating brokerage and agents:', error);
    }
  };

  const handleSaveExistingAgent = async () => {
    if (!selectedBrokerageId || !existingAgentForm.name) return;

    try {
      await createAgent.mutateAsync({
        name: existingAgentForm.name,
        phone: existingAgentForm.phone || undefined,
        email: existingAgentForm.email || undefined,
        brokerage_id: selectedBrokerageId,
      });

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating agent:', error);
    }
  };

  const resetForm = () => {
    setNewBrokerage({ name: '', address: '' });
    setNewBrokerageAgents([{ name: '', phone: '', email: '' }]);
    setSelectedBrokerageId('');
    setExistingAgentForm({ name: '', phone: '', email: '' });
  };

  const isSubmitting = createBrokerage.isPending || createAgent.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add {context === 'listing' ? 'Listing' : 'Selling'} Agent</DialogTitle>
          <DialogDescription>
            Add a new brokerage with agents or add an agent to an existing brokerage.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'new' | 'existing')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" className="gap-2">
              <Building2 className="w-4 h-4" />
              New Brokerage
            </TabsTrigger>
            <TabsTrigger value="existing" className="gap-2">
              <User className="w-4 h-4" />
              Existing Brokerage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Brokerage Name *</Label>
              <Input
                value={newBrokerage.name}
                onChange={(e) => setNewBrokerage({ ...newBrokerage, name: e.target.value })}
                placeholder="Enter brokerage name"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={newBrokerage.address}
                onChange={(e) => setNewBrokerage({ ...newBrokerage, address: e.target.value })}
                placeholder="Enter address"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Agents</Label>
                <Button variant="outline" size="sm" onClick={addAgentRow}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Agent
                </Button>
              </div>
              {newBrokerageAgents.map((agent, index) => (
                <div key={index} className="grid grid-cols-3 gap-2 p-3 border rounded-md">
                  <Input
                    value={agent.name}
                    onChange={(e) => updateAgentRow(index, 'name', e.target.value)}
                    placeholder="Name *"
                  />
                  <Input
                    value={agent.phone}
                    onChange={(e) => updateAgentRow(index, 'phone', e.target.value)}
                    placeholder="Phone"
                  />
                  <Input
                    value={agent.email}
                    onChange={(e) => updateAgentRow(index, 'email', e.target.value)}
                    placeholder="Email"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveNewBrokerage} 
                disabled={isSubmitting || !newBrokerage.name}
              >
                {isSubmitting ? 'Saving...' : 'Save Brokerage & Agents'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="existing" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Select Brokerage *</Label>
              <Select
                value={selectedBrokerageId}
                onValueChange={setSelectedBrokerageId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a brokerage" />
                </SelectTrigger>
                <SelectContent>
                  {brokerages?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Agent Name *</Label>
              <Input
                value={existingAgentForm.name}
                onChange={(e) => setExistingAgentForm({ ...existingAgentForm, name: e.target.value })}
                placeholder="Enter agent name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={existingAgentForm.phone}
                  onChange={(e) => setExistingAgentForm({ ...existingAgentForm, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={existingAgentForm.email}
                  onChange={(e) => setExistingAgentForm({ ...existingAgentForm, email: e.target.value })}
                  placeholder="Email address"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveExistingAgent} 
                disabled={isSubmitting || !selectedBrokerageId || !existingAgentForm.name}
              >
                {isSubmitting ? 'Saving...' : 'Save Agent'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
