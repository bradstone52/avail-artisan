import { useState, useEffect, useMemo } from 'react';
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
import { InternalListingTour, TourFormData } from '@/hooks/useInternalListingTours';
import { useAgents } from '@/hooks/useAgents';
import { useBrokerages } from '@/hooks/useBrokerages';
import { format } from 'date-fns';

interface TourFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tour?: InternalListingTour | null;
  onSubmit: (data: TourFormData) => void;
  isSubmitting?: boolean;
}

export function TourFormDialog({
  open,
  onOpenChange,
  tour,
  onSubmit,
  isSubmitting,
}: TourFormDialogProps) {
  const { data: brokerages = [] } = useBrokerages();
  const { data: allAgents = [] } = useAgents();

  const [selectedBrokerageId, setSelectedBrokerageId] = useState<string>('');
  const [formData, setFormData] = useState<TourFormData>({
    tour_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    touring_party_name: '',
    touring_party_company: '',
    touring_party_phone: '',
    touring_party_email: '',
    touring_agent_id: '',
    notes: '',
  });

  // Filter agents by selected brokerage
  const filteredAgents = useMemo(() => {
    if (!selectedBrokerageId) return [];
    return allAgents.filter((agent) => agent.brokerage_id === selectedBrokerageId);
  }, [allAgents, selectedBrokerageId]);

  useEffect(() => {
    if (tour) {
      // Find the brokerage of the touring agent
      const agent = allAgents.find((a) => a.id === tour.touring_agent_id);
      setSelectedBrokerageId(agent?.brokerage_id || '');

      setFormData({
        tour_date: tour.tour_date
          ? format(new Date(tour.tour_date), "yyyy-MM-dd'T'HH:mm")
          : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        touring_party_name: tour.touring_party_name || '',
        touring_party_company: tour.touring_party_company || '',
        touring_party_phone: tour.touring_party_phone || '',
        touring_party_email: tour.touring_party_email || '',
        touring_agent_id: tour.touring_agent_id || '',
        notes: tour.notes || '',
      });
    } else {
      setSelectedBrokerageId('');
      setFormData({
        tour_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        touring_party_name: '',
        touring_party_company: '',
        touring_party_phone: '',
        touring_party_email: '',
        touring_agent_id: '',
        notes: '',
      });
    }
  }, [tour, open, allAgents]);

  // Reset agent selection when brokerage changes
  const handleBrokerageChange = (brokerageId: string) => {
    setSelectedBrokerageId(brokerageId);
    setFormData((prev) => ({ ...prev, touring_agent_id: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      touring_agent_id: formData.touring_agent_id || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tour ? 'Edit Tour' : 'Log Property Tour'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tour Date/Time */}
          <div>
            <Label htmlFor="tour_date">Tour Date & Time *</Label>
            <Input
              id="tour_date"
              type="datetime-local"
              value={formData.tour_date}
              onChange={(e) =>
                setFormData({ ...formData, tour_date: e.target.value })
              }
              required
              className={formData.tour_date ? 'input-filled' : ''}
            />
          </div>

          {/* Touring Party Info */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Touring Party (if known)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="touring_party_name">Name</Label>
                <Input
                  id="touring_party_name"
                  value={formData.touring_party_name}
                  onChange={(e) =>
                    setFormData({ ...formData, touring_party_name: e.target.value })
                  }
                  className={formData.touring_party_name ? 'input-filled' : ''}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="touring_party_company">Company</Label>
                <Input
                  id="touring_party_company"
                  value={formData.touring_party_company}
                  onChange={(e) =>
                    setFormData({ ...formData, touring_party_company: e.target.value })
                  }
                  className={formData.touring_party_company ? 'input-filled' : ''}
                />
              </div>
              <div>
                <Label htmlFor="touring_party_phone">Phone</Label>
                <Input
                  id="touring_party_phone"
                  type="tel"
                  value={formData.touring_party_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, touring_party_phone: e.target.value })
                  }
                  className={formData.touring_party_phone ? 'input-filled' : ''}
                />
              </div>
              <div>
                <Label htmlFor="touring_party_email">Email</Label>
                <Input
                  id="touring_party_email"
                  type="email"
                  value={formData.touring_party_email}
                  onChange={(e) =>
                    setFormData({ ...formData, touring_party_email: e.target.value })
                  }
                  className={formData.touring_party_email ? 'input-filled' : ''}
                />
              </div>
            </div>
          </div>

          {/* Touring Agent Selection */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Touring Agent
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="brokerage">Brokerage</Label>
                <Select
                  value={selectedBrokerageId || 'none'}
                  onValueChange={(value) =>
                    handleBrokerageChange(value === 'none' ? '' : value)
                  }
                >
                  <SelectTrigger
                    className={selectedBrokerageId ? 'input-filled' : ''}
                  >
                    <SelectValue placeholder="Select brokerage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No brokerage</SelectItem>
                    {brokerages.map((brokerage) => (
                      <SelectItem key={brokerage.id} value={brokerage.id}>
                        {brokerage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="touring_agent_id">Agent</Label>
                <Select
                  value={formData.touring_agent_id || 'none'}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      touring_agent_id: value === 'none' ? '' : value,
                    })
                  }
                  disabled={!selectedBrokerageId}
                >
                  <SelectTrigger
                    className={formData.touring_agent_id ? 'input-filled' : ''}
                  >
                    <SelectValue
                      placeholder={
                        selectedBrokerageId ? 'Select agent' : 'Select brokerage first'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No agent</SelectItem>
                    {filteredAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className={formData.notes ? 'input-filled' : ''}
              placeholder="Tour feedback, interest level, follow-up items..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {tour ? 'Save Changes' : 'Log Tour'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
