import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import { PhaseCard } from '../PhaseCard'
import { DocumentUploadSection } from '../DocumentUploadSection'
import { UnderwritingPhaseData, UnderwritingDocument, useAnalyzePhase, useSavePhaseData } from '@/hooks/useUnderwritings'

interface Props {
  underwritingId: string
  phaseData: UnderwritingPhaseData | undefined
  documents: UnderwritingDocument[]
  isComplete: boolean
}

interface Tenant {
  tenant_name: string; unit: string; square_feet: number
  lease_start_date: string; lease_expiry_date: string
  base_rent_psf: number; base_rent_monthly: number
  lease_type: string; rent_escalations: string
  options_to_renew: string; notable_clauses: string
}

interface SummaryMetrics {
  total_occupied_sf: number; total_vacant_sf: number
  occupancy_rate: number; vacancy_rate: number; walt_years: number
}

interface RolloverRow { year: number; sf_expiring: number; pct_building: number }

export function Phase1Tenancy({ underwritingId, phaseData, documents, isComplete }: Props) {
  const analyze = useAnalyzePhase(underwritingId)
  const save = useSavePhaseData(underwritingId)

  const sd = phaseData?.structured_data as Record<string, unknown> | null
  const [tenants, setTenants] = useState<Tenant[]>((sd?.tenants_table as Tenant[]) || [])
  const [summary, setSummary] = useState<SummaryMetrics | null>((sd?.summary_metrics as SummaryMetrics) || null)
  const [rollover, setRollover] = useState<RolloverRow[]>((sd?.rollover_schedule as RolloverRow[]) || [])
  const [redFlags, setRedFlags] = useState<string[]>((sd?.red_flags as string[]) || [])

  useEffect(() => {
    if (sd) {
      setTenants((sd.tenants_table as Tenant[]) || [])
      setSummary((sd.summary_metrics as SummaryMetrics) || null)
      setRollover((sd.rollover_schedule as RolloverRow[]) || [])
      setRedFlags((sd.red_flags as string[]) || [])
    }
  }, [phaseData?.structured_data])

  const handleAnalyze = () => analyze.mutate(1)

  const handleSave = () => {
    save.mutate({
      phase: 1,
      structuredData: { tenants_table: tenants, summary_metrics: summary, rollover_schedule: rollover, red_flags: redFlags },
    })
  }

  const updateTenant = (idx: number, field: keyof Tenant, value: string | number) => {
    setTenants(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t))
  }

  return (
    <PhaseCard
      phaseNumber={1}
      title="Tenancy & Lease Summary"
      description="Extract tenant roster, WALT, rollover schedule, and red flags from the rent roll."
      isComplete={isComplete}
      isAnalyzing={analyze.isPending}
      onAnalyze={handleAnalyze}
      documents={<DocumentUploadSection underwritingId={underwritingId} documents={documents} />}
      actions={tenants.length > 0 && (
        <Button size="sm" onClick={handleSave} disabled={save.isPending}
          className="border-2 border-foreground shadow-[2px_2px_0_hsl(var(--foreground))]">
          {save.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      )}
    >
      {tenants.length > 0 && (
        <div className="space-y-6">
          {/* Summary metrics */}
          {summary && (
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'Occupied SF', value: Number(summary.total_occupied_sf).toLocaleString() },
                { label: 'Vacant SF', value: Number(summary.total_vacant_sf).toLocaleString() },
                { label: 'Occupancy', value: `${Number(summary.occupancy_rate).toFixed(1)}%` },
                { label: 'Vacancy', value: `${Number(summary.vacancy_rate).toFixed(1)}%` },
                { label: 'WALT', value: `${Number(summary.walt_years).toFixed(1)} yrs` },
              ].map(m => (
                <div key={m.label} className="p-3 border-2 border-foreground/20 bg-muted/30 text-center">
                  <div className="text-xs text-muted-foreground font-bold uppercase">{m.label}</div>
                  <div className="text-lg font-black mt-1">{m.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tenant table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Tenant Roster</h4>
            <div className="overflow-x-auto border-2 border-foreground">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted border-b-2 border-foreground">
                    {['Tenant', 'Unit', 'SF', 'Start', 'Expiry', '$/SF', '$/mo', 'Type', 'Escalations', 'Options'].map(h => (
                      <th key={h} className="px-2 py-2 text-left font-black uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t, idx) => (
                    <tr key={idx} className="border-b border-foreground/10 hover:bg-muted/20">
                      <td className="px-2 py-1"><Input value={t.tenant_name} onChange={e => updateTenant(idx, 'tenant_name', e.target.value)} className="h-7 text-xs border-0 bg-transparent p-0 focus-visible:ring-1" /></td>
                      <td className="px-2 py-1"><Input value={t.unit} onChange={e => updateTenant(idx, 'unit', e.target.value)} className="h-7 text-xs border-0 bg-transparent p-0 w-16 focus-visible:ring-1" /></td>
                      <td className="px-2 py-1"><Input value={t.square_feet} type="number" onChange={e => updateTenant(idx, 'square_feet', +e.target.value)} className="h-7 text-xs border-0 bg-transparent p-0 w-20 focus-visible:ring-1" /></td>
                      <td className="px-2 py-1 whitespace-nowrap text-muted-foreground">{t.lease_start_date}</td>
                      <td className="px-2 py-1 whitespace-nowrap font-medium">{t.lease_expiry_date}</td>
                      <td className="px-2 py-1"><Input value={t.base_rent_psf} type="number" step="0.01" onChange={e => updateTenant(idx, 'base_rent_psf', +e.target.value)} className="h-7 text-xs border-0 bg-transparent p-0 w-16 focus-visible:ring-1" /></td>
                      <td className="px-2 py-1 text-muted-foreground">${Number(t.base_rent_monthly).toLocaleString()}</td>
                      <td className="px-2 py-1"><Badge variant="outline" className="text-[10px] px-1.5">{t.lease_type}</Badge></td>
                      <td className="px-2 py-1 text-muted-foreground max-w-[120px] truncate">{t.rent_escalations}</td>
                      <td className="px-2 py-1 text-muted-foreground max-w-[100px] truncate">{t.options_to_renew}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rollover schedule */}
          {rollover.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Rollover Schedule</h4>
              <div className="flex gap-2 flex-wrap">
                {rollover.map(r => (
                  <div key={r.year} className="flex flex-col items-center p-2 border-2 border-foreground/20 min-w-[70px] text-center">
                    <div className="text-xs text-muted-foreground font-bold">{r.year}</div>
                    <div className="font-black text-sm">{Number(r.pct_building).toFixed(0)}%</div>
                    <div className="text-[10px] text-muted-foreground">{Number(r.sf_expiring).toLocaleString()} sf</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Red flags */}
          {redFlags.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-destructive" /> Red Flags
              </h4>
              <ul className="space-y-1">
                {redFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-destructive mt-0.5">•</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </PhaseCard>
  )
}
