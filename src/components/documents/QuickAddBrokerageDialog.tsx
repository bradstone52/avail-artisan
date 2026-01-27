import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateBrokerage } from '@/hooks/useBrokerages';

interface QuickAddBrokerageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (brokerage: { id: string; name: string }) => void;
  initialName?: string;
}

export function QuickAddBrokerageDialog({
  open,
  onOpenChange,
  onSuccess,
  initialName = '',
}: QuickAddBrokerageDialogProps) {
  const createBrokerage = useCreateBrokerage();
  const [name, setName] = useState(initialName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const brokerage = await createBrokerage.mutateAsync({ name });
      onSuccess?.({ id: brokerage.id, name: brokerage.name });
      onOpenChange(false);
      setName('');
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Brokerage</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brokerage-name">Brokerage Name *</Label>
            <Input
              id="brokerage-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter brokerage name"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBrokerage.isPending}>
              {createBrokerage.isPending ? 'Adding...' : 'Add Brokerage'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
