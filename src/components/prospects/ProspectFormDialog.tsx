import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormattedNumberInput } from '@/components/common/FormattedNumberInput';
import { useCreateProspect, useUpdateProspect } from '@/hooks/useProspects';
import type { Prospect, ProspectFormData, ProspectStatus, ProspectType, ProspectSource } from '@/types/prospect';

interface ProspectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect?: Prospect | null;
}

const prospectStatuses: ProspectStatus[] = [
  'New', 'Contacted', 'Qualified', 'Active', 'On Hold', 'Lost', 'Converted'
];

const prospectTypes: ProspectType[] = ['Tenant', 'Buyer', 'Listing'];

const prospectSources: ProspectSource[] = [
  'Past Client', 'Network', 'Sign Call', 'Cold Call', 'Referral'
];

export function ProspectFormDialog({ open, onOpenChange, prospect }: ProspectFormDialogProps) {
  const createProspect = useCreateProspect();
  const updateProspect = useUpdateProspect();
  const isEditing = !!prospect;

  const [formData, setFormData] = useState<ProspectFormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    requirements: '',
    min_size: undefined,
    max_size: undefined,
    budget: undefined,
    follow_up_date: '',
    status: 'New',
    notes: '',
    prospect_type: 'Tenant',
    source: 'Network',
  });

  useEffect(() => {
    if (prospect) {
      setFormData({
        name: prospect.name,
        email: prospect.email || '',
        phone: prospect.phone || '',
        company: prospect.company || '',
        requirements: prospect.requirements || '',
        min_size: prospect.min_size ?? undefined,
        max_size: prospect.max_size ?? undefined,
        budget: prospect.budget ?? undefined,
        follow_up_date: prospect.follow_up_date || '',
        status: prospect.status as ProspectStatus,
        notes: prospect.notes || '',
        prospect_type: (prospect.prospect_type as ProspectType) || 'Tenant',
        source: (prospect.source as ProspectSource) || 'Network',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        requirements: '',
        min_size: undefined,
        max_size: undefined,
        budget: undefined,
        follow_up_date: '',
        status: 'New',
        notes: '',
        prospect_type: 'Tenant',
        source: 'Network',
      });
    }
  }, [prospect, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && prospect) {
        await updateProspect.mutateAsync({ id: prospect.id, ...formData });
      } else {
        await createProspect.mutateAsync(formData);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isSubmitting = createProspect.isPending || updateProspect.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Prospect' : 'New Prospect'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prospect_type">Type</Label>
              <Select
                value={formData.prospect_type}
                onValueChange={(value) => setFormData({ ...formData, prospect_type: value as ProspectType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {prospectTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => setFormData({ ...formData, source: value as ProspectSource })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {prospectSources.map((source) => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as ProspectStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {prospectStatuses.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="follow_up_date">Follow-up Date</Label>
              <Input
                id="follow_up_date"
                type="date"
                value={formData.follow_up_date}
                onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Min Size (SF)</Label>
              <FormattedNumberInput
                value={formData.min_size}
                onChange={(value) => setFormData({ ...formData, min_size: value ?? undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Size (SF)</Label>
              <FormattedNumberInput
                value={formData.max_size}
                onChange={(value) => setFormData({ ...formData, max_size: value ?? undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label>Budget</Label>
              <FormattedNumberInput
                value={formData.budget}
                onChange={(value) => setFormData({ ...formData, budget: value ?? undefined })}
                prefix="$"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirements">Requirements</Label>
            <Textarea
              id="requirements"
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              rows={3}
              placeholder="Describe what the prospect is looking for..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Prospect' : 'Create Prospect'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
