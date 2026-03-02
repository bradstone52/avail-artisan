import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import type { Deal } from '@/types/database';

interface DealStats {
  count: number;
  totalSF: number;
  totalCommission: number;
}

interface DealBreakdown {
  conditional: { sale: DealStats; lease: DealStats };
  firm: { sale: DealStats; lease: DealStats };
  closed: { sale: DealStats; lease: DealStats };
}

interface CREStatsCardsProps {
  activeDealsCount: number;
  closedDealsCount: number;
  upcomingEventsCount: number;
  dealBreakdown: DealBreakdown;
}

function StatRow({ label, stats }: { label: string; stats: DealStats }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <span>{stats.count} deals</span>
        <span>{stats.totalSF.toLocaleString()} SF</span>
        <span>{formatCurrency(stats.totalCommission)}</span>
      </div>
    </div>
  );
}

export function CREStatsCards({ activeDealsCount, closedDealsCount, upcomingEventsCount, dealBreakdown }: CREStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active Deals</p>
              <p className="text-3xl font-bold">{activeDealsCount}</p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <BarChart3 className="w-3 h-3" />
                  Details
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">Deal Breakdown</h4>
                  <div className="space-y-2 pb-3 border-b border-foreground/10">
                    <p className="font-bold text-sm">Conditional</p>
                    <div className="pl-2 space-y-2">
                      <StatRow label="Sale" stats={dealBreakdown.conditional.sale} />
                      <StatRow label="Lease" stats={dealBreakdown.conditional.lease} />
                    </div>
                  </div>
                  <div className="space-y-2 pb-3 border-b border-foreground/10">
                    <p className="font-bold text-sm">Firm</p>
                    <div className="pl-2 space-y-2">
                      <StatRow label="Sale" stats={dealBreakdown.firm.sale} />
                      <StatRow label="Lease" stats={dealBreakdown.firm.lease} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-sm">Closed</p>
                    <div className="pl-2 space-y-2">
                      <StatRow label="Sale" stats={dealBreakdown.closed.sale} />
                      <StatRow label="Lease" stats={dealBreakdown.closed.lease} />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Closed Deals</p>
          <p className="text-3xl font-bold">{closedDealsCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upcoming Events</p>
          <p className="text-3xl font-bold">{upcomingEventsCount}</p>
          <p className="text-xs text-muted-foreground">next 30 days</p>
        </CardContent>
      </Card>
    </div>
  );
}
