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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormattedNumberInput } from '@/components/common/FormattedNumberInput';
import { useCreateProspect, useUpdateProspect } from '@/hooks/useProspects';
import { useCreateFollowUpDate } from '@/hooks/useProspectFollowUpDates';
import type { Prospect, ProspectFormData, ProspectType, ProspectSource } from '@/types/prospect';

interface ProspectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect?: Prospect | null;
}

const prospectTypes: ProspectType[] = ['Tenant', 'Buyer', 'Listing'];

const prospectSources: ProspectSource[] = [
  'Past Client', 'Network', 'Sign Call', 'Cold Call', 'Referral'
];

export function ProspectFormDialog({ open, onOpenChange, prospect }: ProspectFormDialogProps) {
  const createProspect = useCreateProspect();
  const updateProspect = useUpdateProspect();
  const createFollowUpDate = useCreateFollowUpDate();
  const isEditing = !!prospect;

  const [formData, setFormData] = useState<ProspectFormData>({
    name: '',
    prospect_type: 'Tenant',
    source: 'Network',
    follow_up_date: '',
    referral: '',
    max_size: undefined,
    loading: '',
    use_type: '',
    occupancy_date: '',
    yard_required: false,
    estimated_value: undefined,
    commission: undefined,
    notes: '',
    priority: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (prospect) {
      setFormData({
        name: prospect.name,
        prospect_type: (prospect.prospect_type as ProspectType) || 'Tenant',
        source: (prospect.source as ProspectSource) || 'Network',
        follow_up_date: prospect.follow_up_date || '',
        referral: prospect.referral || '',
        max_size: prospect.max_size ?? undefined,
        loading: prospect.loading || '',
        use_type: prospect.use_type || '',
        occupancy_date: prospect.occupancy_date || '',
        yard_required: prospect.yard_required ?? false,
        estimated_value: prospect.estimated_value ?? undefined,
        commission: prospect.commission ?? undefined,
        notes: prospect.notes || '',
        priority: prospect.priority || '',
        email: prospect.email || '',
        phone: prospect.phone || '',
      });
    } else {
      setFormData({
        name: '',
        prospect_type: 'Tenant',
        source: 'Network',
        follow_up_date: '',
        referral: '',
        max_size: undefined,
        loading: '',
        use_type: '',
        occupancy_date: '',
        yard_required: false,
        estimated_value: undefined,
        commission: undefined,
        notes: '',
        priority: '',
        email: '',
        phone: '',
      });
    }
  }, [prospect, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && prospect) {
        await updateProspect.mutateAsync({ id: prospect.id, ...formData });
        // If follow_up_date was added/changed, also add it to the follow-up dates list
        if (formData.follow_up_date && formData.follow_up_date !== prospect.follow_up_date) {
          await createFollowUpDate.mutateAsync({
            prospectId: prospect.id,
            date: formData.follow_up_date,
          });
        }
      } else {
        const created = await createProspect.mutateAsync(formData);
        // If follow_up_date was set on creation, also add it to the follow-up dates list
        if (formData.follow_up_date && created?.id) {
          await createFollowUpDate.mutateAsync({
            prospectId: created.id,
            date: formData.follow_up_date,
          });
        }
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="prospect" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="prospect">Prospect Info</TabsTrigger>
              <TabsTrigger value="site">Site Info</TabsTrigger>
            </TabsList>

            <TabsContent value="prospect" className="space-y-4 pt-4">
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
              </div>

              <div className="grid grid-cols-2 gap-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                   <Select
                    value={formData.priority || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, priority: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="A">A (High)</SelectItem>
                      <SelectItem value="B">B (Medium)</SelectItem>
                      <SelectItem value="C">C (Low)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referral">Referral</Label>
                  <Input
                    id="referral"
                    value={formData.referral}
                    onChange={(e) => setFormData({ ...formData, referral: e.target.value })}
                    placeholder="Who referred this prospect?"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="prospect@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="site" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Required Size (SF)</Label>
                  <FormattedNumberInput
                    value={formData.max_size}
                    onChange={(value) => setFormData({ ...formData, max_size: value ?? undefined })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loading">Loading</Label>
                  <Input
                    id="loading"
                    value={formData.loading}
                    onChange={(e) => setFormData({ ...formData, loading: e.target.value })}
                    placeholder="e.g., Dock level, Grade level"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="use_type">Use</Label>
                  <Input
                    id="use_type"
                    value={formData.use_type}
                    onChange={(e) => setFormData({ ...formData, use_type: e.target.value })}
                    placeholder="e.g., Warehouse, Manufacturing"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occupancy_date">Occupancy Date</Label>
                  <Input
                    id="occupancy_date"
                    type="date"
                    value={formData.occupancy_date}
                    onChange={(e) => setFormData({ ...formData, occupancy_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 pt-6">
                  <Checkbox
                    id="yard_required"
                    checked={formData.yard_required}
                    onCheckedChange={(checked) => setFormData({ ...formData, yard_required: checked === true })}
                  />
                  <Label htmlFor="yard_required" className="cursor-pointer">Yard Required</Label>
                </div>
                <div className="space-y-2">
                  <Label>Estimated Value</Label>
                  <FormattedNumberInput
                    value={formData.estimated_value}
                    onChange={(value) => setFormData({ ...formData, estimated_value: value ?? undefined })}
                    prefix="$"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Commission (%)</Label>
                  <FormattedNumberInput
                    value={formData.commission}
                    onChange={(value) => setFormData({ ...formData, commission: value ?? undefined })}
                    suffix="%"
                  />
                </div>
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
            </TabsContent>
          </Tabs>

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
