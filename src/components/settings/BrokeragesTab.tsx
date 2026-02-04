import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@/components/common/SearchInput';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useBrokerages, useCreateBrokerage, useUpdateBrokerage, useDeleteBrokerage } from '@/hooks/useBrokerages';
import { useAgents, useCreateAgent, useUpdateAgent, useDeleteAgent } from '@/hooks/useAgents';
import { Edit, Trash2, Plus, ChevronDown, ChevronRight, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { Brokerage, BrokerageFormData, Agent } from '@/types/database';

export function BrokeragesTab() {
  const { data: brokerages, isLoading } = useBrokerages();
  const { data: agents } = useAgents();
  const createBrokerage = useCreateBrokerage();
  const updateBrokerage = useUpdateBrokerage();
  const deleteBrokerage = useDeleteBrokerage();
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrokerage, setEditingBrokerage] = useState<Brokerage | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedBrokerages, setExpandedBrokerages] = useState<Set<string>>(new Set());

  // Add agent dialog state
  const [addAgentDialogOpen, setAddAgentDialogOpen] = useState(false);
  const [addAgentBrokerageId, setAddAgentBrokerageId] = useState<string | null>(null);
  const [agentFormData, setAgentFormData] = useState({
    name: '',
    phone: '',
    email: '',
    brokerage_id: '',
  });
  const [deleteAgentId, setDeleteAgentId] = useState<string | null>(null);

  // Edit agent dialog state
  const [editAgentDialogOpen, setEditAgentDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const [formData, setFormData] = useState<BrokerageFormData>({
    name: '',
    address: '',
    phone: '',
    email: '',
  });

  const filteredBrokerages = brokerages?.filter(brokerage =>
    brokerage.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const toggleBrokerage = (id: string) => {
    setExpandedBrokerages(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getAgentsForBrokerage = (brokerageId: string) => {
    return agents?.filter(agent => agent.brokerage_id === brokerageId) || [];
  };

  const handleOpenDialog = (brokerage?: Brokerage) => {
    if (brokerage) {
      setEditingBrokerage(brokerage);
      setFormData({
        name: brokerage.name,
        address: brokerage.address || '',
        phone: brokerage.phone || '',
        email: brokerage.email || '',
      });
    } else {
      setEditingBrokerage(null);
      setFormData({ name: '', address: '', phone: '', email: '' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBrokerage) {
        await updateBrokerage.mutateAsync({ id: editingBrokerage.id, ...formData });
      } else {
        await createBrokerage.mutateAsync({ name: formData.name, address: formData.address });
      }
      setDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteBrokerage.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleOpenAddAgentDialog = (brokerageId: string) => {
    setAddAgentBrokerageId(brokerageId);
    setAgentFormData({ name: '', phone: '', email: '', brokerage_id: brokerageId });
    setAddAgentDialogOpen(true);
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addAgentBrokerageId) return;
    
    try {
      await createAgent.mutateAsync({
        name: agentFormData.name,
        phone: agentFormData.phone,
        email: agentFormData.email,
        brokerage_id: addAgentBrokerageId,
      });
      setAddAgentDialogOpen(false);
      // Expand the brokerage to show the new agent
      setExpandedBrokerages(prev => new Set(prev).add(addAgentBrokerageId));
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleOpenEditAgentDialog = (agent: Agent) => {
    setEditingAgent(agent);
    setAgentFormData({
      name: agent.name,
      phone: agent.phone || '',
      email: agent.email || '',
      brokerage_id: agent.brokerage_id || '',
    });
    setEditAgentDialogOpen(true);
  };

  const handleUpdateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;
    
    try {
      await updateAgent.mutateAsync({
        id: editingAgent.id,
        name: agentFormData.name,
        phone: agentFormData.phone,
        email: agentFormData.email,
        brokerage_id: agentFormData.brokerage_id || null,
      });
      setEditAgentDialogOpen(false);
      setEditingAgent(null);
      // Expand both old and new brokerage to show the change
      if (agentFormData.brokerage_id) {
        setExpandedBrokerages(prev => new Set(prev).add(agentFormData.brokerage_id));
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteAgent = async () => {
    if (deleteAgentId) {
      await deleteAgent.mutateAsync(deleteAgentId);
      setDeleteAgentId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Brokerages</CardTitle>
        <div className="flex items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search brokerages..."
            className="w-64"
          />
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Brokerage
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : filteredBrokerages.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No brokerages found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Agents</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBrokerages.map((brokerage) => {
                const brokerageAgents = getAgentsForBrokerage(brokerage.id);
                const isExpanded = expandedBrokerages.has(brokerage.id);
                
                return (
                  <>
                    <TableRow key={brokerage.id}>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-6 h-6"
                          onClick={() => toggleBrokerage(brokerage.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{brokerage.name}</TableCell>
                      <TableCell>{brokerage.address || '-'}</TableCell>
                      <TableCell>{brokerageAgents.length}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8"
                            onClick={() => handleOpenAddAgentDialog(brokerage.id)}
                            title="Add Agent"
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleOpenDialog(brokerage)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => setDeleteId(brokerage.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && brokerageAgents.length > 0 && brokerageAgents.map(agent => (
                      <TableRow key={agent.id} className="bg-muted/30">
                        <TableCell></TableCell>
                        <TableCell className="pl-8">
                          <span className="text-muted-foreground">↳</span> {agent.name}
                        </TableCell>
                        <TableCell>
                          {agent.email && <span className="text-sm text-muted-foreground">{agent.email}</span>}
                        </TableCell>
                        <TableCell>
                          {agent.phone && <span className="text-sm text-muted-foreground">{agent.phone}</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-8 h-8"
                              onClick={() => handleOpenEditAgentDialog(agent)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-8 h-8 text-destructive" 
                              onClick={() => setDeleteAgentId(agent.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {isExpanded && brokerageAgents.length === 0 && (
                      <TableRow className="bg-muted/30">
                        <TableCell></TableCell>
                        <TableCell colSpan={4} className="pl-8 text-muted-foreground text-sm">
                          No agents. Click <UserPlus className="w-3 h-3 inline mx-1" /> to add one.
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add/Edit Brokerage Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBrokerage ? 'Edit Brokerage' : 'Add Brokerage'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Brokerage Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            {editingBrokerage && (
              <>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingBrokerage ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Agent Dialog */}
      <Dialog open={addAgentDialogOpen} onOpenChange={setAddAgentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Agent</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAgent} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={agentFormData.name}
                onChange={(e) => setAgentFormData({ ...agentFormData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={agentFormData.phone}
                onChange={(e) => setAgentFormData({ ...agentFormData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={agentFormData.email}
                onChange={(e) => setAgentFormData({ ...agentFormData, email: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddAgentDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Add Agent</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Agent Dialog */}
      <Dialog open={editAgentDialogOpen} onOpenChange={(open) => {
        setEditAgentDialogOpen(open);
        if (!open) setEditingAgent(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateAgent} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={agentFormData.name}
                onChange={(e) => setAgentFormData({ ...agentFormData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={agentFormData.phone}
                onChange={(e) => setAgentFormData({ ...agentFormData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={agentFormData.email}
                onChange={(e) => setAgentFormData({ ...agentFormData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Brokerage</Label>
              <Select
                value={agentFormData.brokerage_id || 'none'}
                onValueChange={(value) =>
                  setAgentFormData({ ...agentFormData, brokerage_id: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brokerage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No brokerage</SelectItem>
                  {brokerages?.map((brokerage) => (
                    <SelectItem key={brokerage.id} value={brokerage.id}>
                      {brokerage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditAgentDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Brokerage"
        description="Are you sure you want to delete this brokerage? This will also remove it from any associated agents."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={!!deleteAgentId}
        onOpenChange={(open) => !open && setDeleteAgentId(null)}
        title="Delete Agent"
        description="Are you sure you want to delete this agent?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteAgent}
      />
    </Card>
  );
}
