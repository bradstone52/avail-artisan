import { useState } from 'react';
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
import { Edit, Trash2, Plus, ChevronDown, ChevronRight, UserPlus, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search brokerages..."
            className="w-64"
          />
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Brokerage
        </Button>
      </div>
      {isLoading ? (
        <p className="text-center py-8 text-muted-foreground">Loading...</p>
      ) : filteredBrokerages.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground border border-border bg-card rounded-lg" style={{ borderRadius: 'var(--radius)' }}>No brokerages found</p>
      ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Agents</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBrokerages.map((brokerage, index) => {
                const brokerageAgents = getAgentsForBrokerage(brokerage.id);
                const isExpanded = expandedBrokerages.has(brokerage.id);
                const isEvenRow = index % 2 === 1;
                const hoverClass = isEvenRow
                  ? 'hover:!bg-slate-100 dark:hover:!bg-slate-800/60'
                  : 'hover:!bg-slate-50 dark:hover:!bg-slate-800/40';
                const outlineClass = 'outline-0 hover:outline hover:outline-1 hover:outline-slate-300 dark:hover:outline-slate-600 hover:-outline-offset-1';
                
                return (
                  <>
                    <TableRow
                      key={brokerage.id}
                      className={cn(
                        'cursor-pointer transition-all !border-b !border-border',
                        isEvenRow ? 'bg-table-stripe' : '',
                        hoverClass,
                      )}
                      onClick={() => toggleBrokerage(brokerage.id)}
                    >
                      <TableCell>
                        <div className="w-6 h-6 flex items-center justify-center">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{brokerage.name}</TableCell>
                      <TableCell>{brokerage.address || '-'}</TableCell>
                      <TableCell>{brokerageAgents.length}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAddAgentDialog(brokerage.id);
                              }}
                            >
                              <UserPlus className="mr-2 h-4 w-4" />
                              Add Agent
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDialog(brokerage);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(brokerage.id);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {isExpanded && brokerageAgents.length > 0 && brokerageAgents.map(agent => (
                      <TableRow key={agent.id} className="bg-slate-50 dark:bg-slate-900/20 !border-b border-border hover:!bg-slate-100 dark:hover:!bg-slate-800/40 outline-0 hover:outline hover:outline-1 hover:outline-slate-300 dark:hover:outline-slate-600 hover:-outline-offset-1 transition-all">
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenEditAgentDialog(agent)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteAgentId(agent.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {isExpanded && brokerageAgents.length === 0 && (
                      <TableRow className="bg-slate-50 dark:bg-slate-900/20 !border-b border-border">
                        <TableCell></TableCell>
                        <TableCell colSpan={4} className="pl-8 text-muted-foreground text-sm">
                          No agents. Use the menu to add one.
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}


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
    </div>
  );
}
