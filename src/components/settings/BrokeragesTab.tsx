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
import { SearchInput } from '@/components/common/SearchInput';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useBrokerages, useCreateBrokerage, useUpdateBrokerage, useDeleteBrokerage } from '@/hooks/useBrokerages';
import { Edit, Trash2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { Brokerage, BrokerageFormData } from '@/types/database';

export function BrokeragesTab() {
  const { data: brokerages, isLoading } = useBrokerages();
  const createBrokerage = useCreateBrokerage();
  const updateBrokerage = useUpdateBrokerage();
  const deleteBrokerage = useDeleteBrokerage();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrokerage, setEditingBrokerage] = useState<Brokerage | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<BrokerageFormData>({
    name: '',
    address: '',
    phone: '',
    email: '',
  });

  const filteredBrokerages = brokerages?.filter(brokerage =>
    brokerage.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

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
        await createBrokerage.mutateAsync(formData);
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
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBrokerages.map((brokerage) => (
                <TableRow key={brokerage.id}>
                  <TableCell className="font-medium">{brokerage.name}</TableCell>
                  <TableCell>{brokerage.address || '-'}</TableCell>
                  <TableCell>{brokerage.phone || '-'}</TableCell>
                  <TableCell>{brokerage.email || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleOpenDialog(brokerage)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => setDeleteId(brokerage.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBrokerage ? 'Edit Brokerage' : 'Add Brokerage'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
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
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingBrokerage ? 'Update' : 'Create'}</Button>
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
    </Card>
  );
}
