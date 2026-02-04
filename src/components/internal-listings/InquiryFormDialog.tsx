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
import {
  InternalListingInquiry,
  InquiryFormData,
  INQUIRY_SOURCES,
  INQUIRY_STAGES,
} from '@/hooks/useInternalListingInquiries';
import { useAgents } from '@/hooks/useAgents';

interface InquiryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inquiry?: InternalListingInquiry | null;
  onSubmit: (data: InquiryFormData) => void;
  isSubmitting?: boolean;
}

export function InquiryFormDialog({
  open,
  onOpenChange,
  inquiry,
  onSubmit,
  isSubmitting,
}: InquiryFormDialogProps) {
  const agentsQuery = useAgents();
  // Filter to only ClearView Commercial Realty Inc. agents
  const agents = (agentsQuery.data ?? []).filter(
    (agent) =>
      agent.brokerage?.name?.toLowerCase() === 'clearview commercial realty inc.'
  );
  const [formData, setFormData] = useState<InquiryFormData>({
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    contact_company: '',
    source: 'Direct',
    stage: 'New',
    assigned_broker_id: '',
    notes: '',
    next_follow_up: '',
  });

  useEffect(() => {
    if (inquiry) {
      setFormData({
        contact_name: inquiry.contact_name,
        contact_email: inquiry.contact_email || '',
        contact_phone: inquiry.contact_phone || '',
        contact_company: inquiry.contact_company || '',
        source: inquiry.source,
        stage: inquiry.stage,
        assigned_broker_id: inquiry.assigned_broker_id || '',
        notes: inquiry.notes || '',
        next_follow_up: inquiry.next_follow_up || '',
      });
    } else {
      setFormData({
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        contact_company: '',
        source: 'Direct',
        stage: 'New',
        assigned_broker_id: '',
        notes: '',
        next_follow_up: '',
      });
    }
  }, [inquiry, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      assigned_broker_id: formData.assigned_broker_id || undefined,
      next_follow_up: formData.next_follow_up || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{inquiry ? 'Edit Inquiry' : 'New Inquiry'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Contact Information
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="contact_name">Name *</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_name: e.target.value })
                  }
                  required
                  className={formData.contact_name ? 'input-filled' : ''}
                />
              </div>
              <div>
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_email: e.target.value })
                  }
                  className={formData.contact_email ? 'input-filled' : ''}
                />
              </div>
              <div>
                <Label htmlFor="contact_phone">Phone</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_phone: e.target.value })
                  }
                  className={formData.contact_phone ? 'input-filled' : ''}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="contact_company">Company</Label>
                <Input
                  id="contact_company"
                  value={formData.contact_company}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_company: e.target.value })
                  }
                  className={formData.contact_company ? 'input-filled' : ''}
                />
              </div>
            </div>
          </div>

          {/* Lead Details */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Lead Details
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="source">Source</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) =>
                    setFormData({ ...formData, source: value })
                  }
                >
                  <SelectTrigger className={formData.source ? 'input-filled' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INQUIRY_SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="stage">Stage</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(value) =>
                    setFormData({ ...formData, stage: value })
                  }
                >
                  <SelectTrigger className={formData.stage ? 'input-filled' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INQUIRY_STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="assigned_broker_id">Assigned Broker</Label>
                <Select
                  value={formData.assigned_broker_id || 'none'}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      assigned_broker_id: value === 'none' ? '' : value,
                    })
                  }
                >
                  <SelectTrigger
                    className={formData.assigned_broker_id ? 'input-filled' : ''}
                  >
                    <SelectValue placeholder="Select broker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="next_follow_up">Next Follow-up</Label>
                <Input
                  id="next_follow_up"
                  type="date"
                  value={formData.next_follow_up}
                  onChange={(e) =>
                    setFormData({ ...formData, next_follow_up: e.target.value })
                  }
                  className={formData.next_follow_up ? 'input-filled' : ''}
                />
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
              {inquiry ? 'Save Changes' : 'Create Inquiry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
