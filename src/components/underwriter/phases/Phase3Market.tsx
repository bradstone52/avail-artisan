import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PhaseCard } from '../PhaseCard'
import { UnderwritingPhaseData, useAnalyzePhase, useSavePhaseData } from '@/hooks/useUnderwritings'
import { cn } from '@/lib/utils'

interface Props {
  underwritingId: string
  phaseData: UnderwritingPhaseData | undefined
  isComplete: boolean
}

type RentPosition = 'below_market' | 'at_market' | 'above_market'
interface TenantRent { tenant_name: string; in_place_psf: number; market_psf: number; position: RentPosition }
interface PositioningOption { label: string; description: string }

const POSITION_COLORS: Record<RentPosition, string> = {
  below_market: 'bg-destructive/10 text-destructive border-destructive/30',
  at_market: 'bg-secondary/30 text-secondary-foreground border-secondary/50',
  above_market: 'bg-primary/10 text-primary border-primary/30',
}

export function Phase3Market({ underwritingId, phaseData, isComplete }: Props) {
  const analyze = useAnalyzePhase(underwritingId)
  const save = useSavePhaseData(underwritingId)
  const sd = phaseData?.structured_data as Record<string, unknown> | null

  const [tenantComparison, setTenantComparison] = useState<TenantRent[]>((sd?.tenant_rent_comparison as TenantRent[]) || [])
  const [positioning, setPositioning] = useState<PositioningOption[]>((sd?.positioning_options as PositioningOption[]) || [])
  const [summary, setSummary] = useState<string>((sd?.market_summary_text as string) || '')
  const [rentRange, setRentRange] = useState<{ low: number; high: number; notes: string } | null>(
    (sd?.market_rent_range as { low: number; high: number; notes: string }) || null
  )

  useEffect(() => {
    if (sd) {
      setTenantComparison((sd.tenant_rent_comparison as TenantRent[]) || [])
      setPositioning((sd.positioning_options as PositioningOption[]) || [])
      setSummary((sd.market_summary_text as string) || '')
      setRentRange((sd.market_rent_range as { low: number; high: number; notes: string }) || null)
    }
  }, [phaseData?.structured_data])

  const hasData = !!summary || tenantComparison.length > 0

  return (
    <PhaseCard
      phaseNumber={3}
      title="Market & Rent Position"
      description="Calgary submarket fundamentals, in-place vs market rent comparison, and positioning options."
      isComplete={isComplete}
      isAnalyzing={analyze.isPending}
      onAnalyze={() => analyze.mutate(3)}
      analyzeLabel="Get Market Context"
      actions={hasData && (
        <Button size="sm" onClick={() => save.mutate({ phase: 3, structuredData: { market_summary_text: summary, market_rent_range: rentRange, tenant_rent_comparison: tenantComparison, positioning_options: positioning } })}
          disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      )}
    >
      {hasData && (
        <div className="space-y-6">
          {summary && (
            <div className="p-4 border border-border rounded-lg bg-muted/20">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Market Summary</h4>
              <p className="text-sm leading-relaxed">{summary}</p>
              {rentRange && (
                <p className="text-sm font-bold mt-2">
                  Market Rent Range: ${rentRange.low}–${rentRange.high}/SF net
                  {rentRange.notes && <span className="font-normal text-muted-foreground"> — {rentRange.notes}</span>}
                </p>
              )}
            </div>
          )}

          {tenantComparison.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Rent Comparison</h4>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                   <colgroup>
                      <col className="w-auto" />
                      <col className="w-32" />
                      <col className="w-32" />
                      <col className="w-36" />
                    </colgroup>
                    <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs">Tenant</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground text-xs whitespace-nowrap">In-Place $/SF</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground text-xs whitespace-nowrap">Market $/SF</th>
                      <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenantComparison.map((t, i) => (
                      <tr key={i} className="border-b border-foreground/10">
                        <td className="px-3 py-2 font-medium text-sm break-words">{t.tenant_name}</td>
                        <td className="px-3 py-2 text-right text-sm tabular-nums whitespace-nowrap">${Number(t.in_place_psf).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-sm tabular-nums whitespace-nowrap">${Number(t.market_psf).toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          <Badge className={cn('text-[10px] border whitespace-nowrap', POSITION_COLORS[t.position] || POSITION_COLORS.at_market)}>
                            {t.position?.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {positioning.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Positioning Options</h4>
              <div className="grid grid-cols-3 gap-3">
                {positioning.map((p, i) => (
                  <Card key={i} className="p-3">
                    <div className="font-medium text-xs mb-1">{p.label}</div>
                    <div className="text-xs text-muted-foreground">{p.description}</div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PhaseCard>
  )
}
