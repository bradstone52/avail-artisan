import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { PropertyTenant } from '@/hooks/usePropertyTenants';

interface AddTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    tenant_name: string;
    unit_number?: string | null;
    size_sf?: number | null;
    lease_expiry?: string | null;
    notes?: string | null;
  }) => Promise<boolean>;
  tenant?: PropertyTenant | null;
  propertyName?: string;
}

// Format number with commas
const formatNumberWithCommas = (value: string): string => {
  const num = value.replace(/[^\d]/g, '');
  if (!num) return '';
  return parseInt(num).toLocaleString('en-US');
};

// Parse formatted number back to raw digits
const parseFormattedNumber = (value: string): string => {
  return value.replace(/[^\d]/g, '');
};

export function AddTenantDialog({
  open,
  onOpenChange,
  onSave,
  tenant,
  propertyName,
}: AddTenantDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [sizeSf, setSizeSf] = useState('');
  const [leaseExpiry, setLeaseExpiry] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (tenant) {
      setTenantName(tenant.tenant_name);
      setUnitNumber(tenant.unit_number || '');
      setSizeSf(tenant.size_sf?.toString() || '');
      setLeaseExpiry(tenant.lease_expiry ? parseISO(tenant.lease_expiry) : undefined);
      setNotes(tenant.notes || '');
    } else {
      setTenantName('');
      setUnitNumber('');
      setSizeSf('');
      setLeaseExpiry(undefined);
      setNotes('');
    }
  }, [tenant, open]);

  const handleSave = async () => {
    if (!tenantName.trim()) return;

    setSaving(true);
    try {
      const success = await onSave({
        tenant_name: tenantName.trim(),
        unit_number: unitNumber.trim() || null,
        size_sf: sizeSf ? parseInt(parseFormattedNumber(sizeSf)) : null,
        lease_expiry: leaseExpiry ? format(leaseExpiry, 'yyyy-MM-dd') : null,
        notes: notes.trim() || null,
      });

      if (success) {
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {tenant ? 'Edit Tenant' : 'Add Tenant'}
          </DialogTitle>
          {propertyName && (
            <p className="text-sm text-muted-foreground mt-1">
              at {propertyName}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="tenant-name">Tenant Name *</Label>
            <Input
              id="tenant-name"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="e.g., ABC Logistics Inc."
              className="mt-1"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="unit-number">Unit Number</Label>
            <Input
              id="unit-number"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              placeholder="e.g., Unit 101, Bay 3"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="size-sf">Size (SF)</Label>
            <Input
              id="size-sf"
              value={formatNumberWithCommas(sizeSf)}
              onChange={(e) => setSizeSf(parseFormattedNumber(e.target.value))}
              placeholder="e.g., 25,000"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave blank if unknown
            </p>
          </div>

          <div>
            <Label>Lease Expiry Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal mt-1',
                    !leaseExpiry && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {leaseExpiry ? format(leaseExpiry, 'MMM d, yyyy') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={leaseExpiry}
                  onSelect={setLeaseExpiry}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!tenantName.trim() || saving}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tenant ? 'Save Changes' : 'Add Tenant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
