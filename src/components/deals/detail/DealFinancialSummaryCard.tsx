import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import type { Deal } from '@/types/database';

interface DealFinancialSummaryCardProps {
  deal: Deal;
}

export function DealFinancialSummaryCard({ deal }: DealFinancialSummaryCardProps) {
  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '—';
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    return `${value}%`;
  };

  // Calculate commission
  const dealValue = deal.deal_value || 0;
  const commissionRate = deal.commission_percent || 0;
  const gstRate = deal.gst_rate || 0;
  
  const commissionBeforeGST = dealValue * (commissionRate / 100);
  const gstOnCommission = commissionBeforeGST * (gstRate / 100);
  const totalCommission = commissionBeforeGST + gstOnCommission;

  // Split calculations
  const otherBrokeragePercent = deal.other_brokerage_percent ?? 0;
  const clearviewPercent = deal.clearview_percent || 0;
  
  const otherBrokerageCommission = dealValue * (otherBrokeragePercent / 100);
  const clearviewCommission = dealValue * (clearviewPercent / 100);
  
  const otherBrokerageGST = otherBrokerageCommission * (gstRate / 100);
  const clearviewGST = clearviewCommission * (gstRate / 100);
  
  const otherBrokerageTotal = otherBrokerageCommission + otherBrokerageGST;
  const clearviewTotal = clearviewCommission + clearviewGST;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Financial Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Deal Value</p>
            <p className="text-lg font-semibold">{formatCurrency(deal.deal_value)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Commission Rate</p>
            <p className="text-lg font-semibold">{formatPercent(deal.commission_percent)}</p>
          </div>
        </div>
        
        {deal.deal_value && deal.commission_percent && (
          <>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Est. Commission (before GST)</span>
                <span className="font-medium">{formatCurrency(commissionBeforeGST)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">GST ({gstRate}%)</span>
                <span className="font-medium">{formatCurrency(gstOnCommission)}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Commission</span>
                <span className="text-primary">{formatCurrency(totalCommission)}</span>
              </div>
            </div>
            
            <div className="border-t pt-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Commission Split</p>
              <div className="flex justify-between items-center">
                <span className="text-sm">Other Brokerage ({otherBrokeragePercent}%)</span>
                <span className="font-medium">{formatCurrency(otherBrokerageTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">ClearView ({clearviewPercent}%)</span>
                <span className="font-medium text-primary">{formatCurrency(clearviewTotal)}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
