import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FormattedNumberInput } from '@/components/common/FormattedNumberInput';
import { Input } from '@/components/ui/input';
import { DollarSign, Save, Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import type { Deal } from '@/types/database';

interface DealFinancialSectionProps {
  deal: Deal;
  onUpdate: (data: { id: string } & Partial<Deal>) => Promise<Deal>;
}

export function DealFinancialSection({ deal, onUpdate }: DealFinancialSectionProps) {
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    deal_value: deal.deal_value ?? undefined,
    commission_percent: deal.commission_percent ?? 3,
    other_brokerage_percent: deal.other_brokerage_percent ?? 1.5,
    clearview_percent: deal.clearview_percent ?? 1.5,
    gst_rate: deal.gst_rate ?? 5,
    close_date: deal.close_date || '',
  });

  // Calculations
  const totalCommissionRate = formData.commission_percent || 0;
  const commissionBeforeGST = formData.deal_value ? (formData.deal_value * totalCommissionRate) / 100 : 0;
  const gstOnCommission = commissionBeforeGST * (formData.gst_rate || 0) / 100;
  const totalCommission = commissionBeforeGST + gstOnCommission;

  const otherBrokerageRate = formData.other_brokerage_percent ?? 0;
  const otherCommissionBeforeGST = formData.deal_value ? (formData.deal_value * otherBrokerageRate) / 100 : 0;
  const otherGST = otherCommissionBeforeGST * (formData.gst_rate || 0) / 100;
  const otherTotal = otherCommissionBeforeGST + otherGST;

  const cvRate = formData.clearview_percent || 0;
  const cvCommissionBeforeGST = formData.deal_value ? (formData.deal_value * cvRate) / 100 : 0;
  const cvGST = cvCommissionBeforeGST * (formData.gst_rate || 0) / 100;
  const cvTotal = cvCommissionBeforeGST + cvGST;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({ 
        id: deal.id, 
        deal_value: formData.deal_value ?? null,
        commission_percent: formData.commission_percent ?? null,
        other_brokerage_percent: formData.other_brokerage_percent ?? null,
        clearview_percent: formData.clearview_percent ?? null,
        gst_rate: formData.gst_rate ?? null,
        close_date: formData.close_date || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Financial Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sale Price / Deal Value</Label>
              <FormattedNumberInput
                value={formData.deal_value}
                onChange={(value) => setFormData({ ...formData, deal_value: value ?? undefined })}
                prefix="$"
              />
            </div>
            <div className="space-y-2">
              <Label>Closing Date</Label>
              <Input
                type="date"
                value={formData.close_date}
                onChange={(e) => setFormData({ ...formData, close_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Total Commission %</Label>
              <FormattedNumberInput
                value={formData.commission_percent}
                onChange={(value) => setFormData({ ...formData, commission_percent: value ?? undefined })}
                suffix="%"
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Other Brokerage %</Label>
              <FormattedNumberInput
                value={formData.other_brokerage_percent}
                onChange={(value) => setFormData({ ...formData, other_brokerage_percent: value ?? undefined })}
                suffix="%"
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label>ClearView %</Label>
              <FormattedNumberInput
                value={formData.clearview_percent}
                onChange={(value) => setFormData({ ...formData, clearview_percent: value ?? undefined })}
                suffix="%"
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label>GST Rate %</Label>
              <FormattedNumberInput
                value={formData.gst_rate}
                onChange={(value) => setFormData({ ...formData, gst_rate: value ?? undefined })}
                suffix="%"
                max={100}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Commission Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Commission Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            {/* Total Commission */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <h4 className="font-semibold mb-3 border-b pb-2">Total Commission</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commission (excl. GST):</span>
                  <span className="font-medium">{formatCurrency(commissionBeforeGST)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST on Commission:</span>
                  <span className="font-medium">{formatCurrency(gstOnCommission)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-semibold">
                  <span>Total Commission (incl. GST):</span>
                  <span>{formatCurrency(totalCommission)}</span>
                </div>
              </div>
            </div>

            {/* Other Brokerage Portion */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <h4 className="font-semibold mb-3 border-b pb-2">Other Brokerage - {otherBrokerageRate}%</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commission (excl. GST):</span>
                  <span className="font-medium">{formatCurrency(otherCommissionBeforeGST)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST:</span>
                  <span className="font-medium">{formatCurrency(otherGST)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-semibold">
                  <span>Total:</span>
                  <span>{formatCurrency(otherTotal)}</span>
                </div>
              </div>
            </div>

            {/* ClearView Portion */}
            <div className="p-4 border rounded-lg bg-primary/10">
              <h4 className="font-semibold mb-3 border-b pb-2">ClearView - {cvRate}%</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commission (excl. GST):</span>
                  <span className="font-medium">{formatCurrency(cvCommissionBeforeGST)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST:</span>
                  <span className="font-medium">{formatCurrency(cvGST)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-semibold">
                  <span>Total:</span>
                  <span>{formatCurrency(cvTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {formData.deal_value && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Commission Calculation Notes: {formatCurrency(formData.deal_value)} x {totalCommissionRate}%
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
