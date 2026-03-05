import { Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { LeaseRateYear } from '@/types/database';
import { formatCurrency } from '@/lib/format';

interface LeaseRateScheduleProps {
  rates: LeaseRateYear[];
  sizeSf: number | undefined;
  leaseTermMonths: number | undefined;
  onChange: (rates: LeaseRateYear[]) => void;
  readOnly?: boolean;
}

function lineValue(r: LeaseRateYear, sizeSf: number) {
  return (r.rate_psf * sizeSf * r.months) / 12;
}

/** Redistribute remaining months across years based on term */
function distributeMonths(count: number, termMonths: number): number[] {
  if (count === 0) return [];
  const months: number[] = [];
  let remaining = termMonths;
  for (let i = 0; i < count; i++) {
    if (i === count - 1) {
      months.push(Math.max(1, remaining));
    } else {
      const m = Math.min(12, remaining);
      months.push(Math.max(1, m));
      remaining -= m;
    }
  }
  return months;
}

export function LeaseRateSchedule({
  rates,
  sizeSf,
  leaseTermMonths,
  onChange,
  readOnly = false,
}: LeaseRateScheduleProps) {
  const sf = sizeSf ?? 0;
  const totalMonths = rates.reduce((s, r) => s + r.months, 0);
  const totalValue = rates.reduce((s, r) => s + lineValue(r, sf), 0);
  const term = leaseTermMonths ?? 0;
  const monthsWarning = term > 0 && totalMonths !== term;

  const addYear = () => {
    const newCount = rates.length + 1;
    const distributed = distributeMonths(newCount, term || newCount * 12);
    const newRates: LeaseRateYear[] = rates.map((r, i) => ({
      ...r,
      months: distributed[i] ?? r.months,
    }));
    newRates.push({ year: newCount, rate_psf: rates[rates.length - 1]?.rate_psf ?? 0, months: distributed[newCount - 1] ?? 12 });
    onChange(newRates);
  };

  const removeYear = (idx: number) => {
    const next = rates.filter((_, i) => i !== idx).map((r, i) => ({ ...r, year: i + 1 }));
    onChange(next);
  };

  const update = (idx: number, field: 'rate_psf' | 'months', raw: string) => {
    const val = parseFloat(raw.replace(/[^0-9.]/g, '')) || 0;
    const next = rates.map((r, i) => i === idx ? { ...r, [field]: val } : r);
    onChange(next);
  };

  if (readOnly) {
    return (
      <div className="rounded-md border border-border overflow-hidden text-sm">
        <div className="grid grid-cols-4 bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <span>Year</span>
          <span>Rate PSF</span>
          <span>Months</span>
          <span className="text-right">Annual Value</span>
        </div>
        {rates.map((r, i) => (
          <div key={i} className="grid grid-cols-4 px-3 py-2 border-t border-border">
            <span>Year {r.year}</span>
            <span>${r.rate_psf.toFixed(2)}/SF</span>
            <span>{r.months} mo</span>
            <span className="text-right">{sf > 0 ? formatCurrency(lineValue(r, sf)) : '—'}</span>
          </div>
        ))}
        {sf > 0 && (
          <div className="grid grid-cols-4 px-3 py-2 border-t border-border bg-muted/40 font-semibold">
            <span className="col-span-3">Total Lease Value</span>
            <span className="text-right">{formatCurrency(totalValue)}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-border overflow-hidden">
        <div className="grid grid-cols-[60px_1fr_1fr_1fr_32px] bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide gap-2">
          <span>Year</span>
          <span>Rate PSF</span>
          <span>Months</span>
          <span className="text-right">Line Value</span>
          <span />
        </div>
        {rates.map((r, i) => (
          <div key={i} className="grid grid-cols-[60px_1fr_1fr_1fr_32px] items-center px-3 py-2 border-t border-border gap-2">
            <span className="text-sm font-medium">Yr {r.year}</span>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-sm">$</span>
              <Input
                className="h-8 text-sm"
                value={r.rate_psf === 0 ? '' : r.rate_psf}
                onChange={(e) => update(i, 'rate_psf', e.target.value)}
                placeholder="0.00"
              />
              <span className="text-muted-foreground text-sm whitespace-nowrap">/SF</span>
            </div>
            <Input
              className="h-8 text-sm"
              value={r.months === 0 ? '' : r.months}
              onChange={(e) => update(i, 'months', e.target.value)}
              placeholder="12"
            />
            <span className="text-sm text-right">
              {sf > 0 ? formatCurrency(lineValue(r, sf)) : '—'}
            </span>
            {i > 0 ? (
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeYear(i)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            ) : <span />}
          </div>
        ))}
        {sf > 0 && rates.length > 0 && (
          <div className="grid grid-cols-[60px_1fr_1fr_1fr_32px] px-3 py-2 border-t border-border bg-muted/40 font-semibold gap-2 text-sm">
            <span className="col-span-3">Total Lease Value</span>
            <span className="text-right">{formatCurrency(totalValue)}</span>
            <span />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addYear} className="gap-1">
          <Plus className="w-3 h-3" /> Add Year
        </Button>
        {term > 0 && (
          <span className={`text-xs ${monthsWarning ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
            {totalMonths} of {term} months allocated{monthsWarning ? ' ⚠' : ' ✓'}
          </span>
        )}
      </div>
    </div>
  );
}
