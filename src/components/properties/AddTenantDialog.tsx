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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2, Building2 } from 'lucide-react';
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
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            {tenant ? 'Edit Tenant' : 'Add Tenant'}
          </DialogTitle>
          {propertyName && (
            <p className="text-sm text-muted-foreground mt-2 pl-12">
              at {propertyName}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-5 py-5">
          {/* Tenant Name - Primary field, larger */}
          <div>
            <Label htmlFor="tenant-name" className="text-base font-semibold">
              Tenant Name *
            </Label>
            <Input
              id="tenant-name"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="e.g., ABC Logistics Inc."
              className="mt-2 h-12 text-base"
              autoFocus
            />
          </div>

          {/* Two column layout for unit and size on larger screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit-number" className="text-base font-semibold">
                Unit Number
              </Label>
              <Input
                id="unit-number"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                placeholder="e.g., Unit 101"
                className="mt-2 h-12 text-base"
              />
            </div>

            <div>
              <Label htmlFor="size-sf" className="text-base font-semibold">
                Size (SF)
              </Label>
              <Input
                id="size-sf"
                value={formatNumberWithCommas(sizeSf)}
                onChange={(e) => setSizeSf(parseFormattedNumber(e.target.value))}
                placeholder="e.g., 25,000"
                className="mt-2 h-12 text-base"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Lease Expiry */}
          <div>
            <Label className="text-base font-semibold">Lease Expiry Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal mt-2 h-12 text-base',
                    !leaseExpiry && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-3 h-5 w-5" />
                  {leaseExpiry ? format(leaseExpiry, 'MMMM d, yyyy') : 'Select date (optional)'}
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

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-base font-semibold">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information..."
              className="mt-2 text-base min-h-[80px]"
              rows={3}
            />
          </div>
        </div>

        {/* Sticky footer with larger buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-12 text-base font-semibold flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!tenantName.trim() || saving}
            className="h-12 text-base font-semibold flex-1"
          >
            {saving && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
            {tenant ? 'Save Changes' : 'Add Tenant'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
