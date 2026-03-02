import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Lock, Unlock } from 'lucide-react'
import { PhaseCard } from '../PhaseCard'
import { UnderwritingPhaseData, useAnalyzePhase, useSavePhaseData } from '@/hooks/useUnderwritings'
import { cn } from '@/lib/utils'

interface Props {
  underwritingId: string
  phaseData: UnderwritingPhaseData | undefined
  isComplete: boolean
  currentNOI?: number
}

interface ValRow { cap_rate: number; value_current_noi: number; value_stabilized_noi: number; locked?: boolean }

export function Phase4Valuation({ underwritingId, phaseData, isComplete, currentNOI }: Props) {
  const analyze = useAnalyzePhase(underwritingId)
  const save = useSavePhaseData(underwritingId)
  const sd = phaseData?.structured_data as Record<string, unknown> | null

  const [currentNOIInput, setCurrentNOIInput] = useState(currentNOI || 0)
  const [stabilizedNOI, setStabilizedNOI] = useState(0)
  const [editingNOI, setEditingNOI] = useState<'current' | 'stabilized' | null>(null)
  const [rawNOI, setRawNOI] = useState('')

  const fmtCurrency = (v: number) => '$' + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const [capRange, setCapRange] = useState([5.0, 7.5])
  const [table, setTable] = useState<ValRow[]>((sd?.valuation_table as ValRow[]) || [])
  const [capBand, setCapBand] = useState<{ low: number; high: number; rationale: string } | null>(
    (sd?.likely_cap_band as { low: number; high: number; rationale: string }) || null
  )
  const [commentary, setCommentary] = useState<string>((sd?.pricing_commentary as string) || '')

  useEffect(() => {
    if (sd) {
      setTable((sd.valuation_table as ValRow[]) || [])
      setCapBand((sd.likely_cap_band as { low: number; high: number; rationale: string }) || null)
      setCommentary((sd.pricing_commentary as string) || '')
    }
  }, [phaseData?.structured_data])

  const toggleLock = (idx: number) => {
    setTable(prev => prev.map((r, i) => i === idx ? { ...r, locked: !r.locked } : r))
  }

  return (
    <PhaseCard
      phaseNumber={4}
      title="Valuation"
      description="Cap rate scenario table with current and stabilized NOI valuations."
      isComplete={isComplete}
      isAnalyzing={analyze.isPending}
      onAnalyze={() => analyze.mutate(4)}
      analyzeLabel="Generate Valuation Scenarios"
      actions={table.length > 0 && (
        <Button size="sm" onClick={() => save.mutate({ phase: 4, structuredData: { valuation_table: table, likely_cap_band: capBand, pricing_commentary: commentary } })}
          disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      )}
    >
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Current NOI ($)</Label>
            {editingNOI === 'current' ? (
              <input autoFocus type="number" value={rawNOI}
                onChange={e => setRawNOI(e.target.value)}
                onBlur={() => { setCurrentNOIInput(parseFloat(rawNOI) || 0); setEditingNOI(null) }}
                onKeyDown={e => { if (e.key === 'Enter') { setCurrentNOIInput(parseFloat(rawNOI) || 0); setEditingNOI(null) } }}
            className="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background" />
            ) : (
              <div onClick={() => { setRawNOI(String(currentNOIInput || '')); setEditingNOI('current') }}
                className="w-full border border-input rounded-md px-3 py-2 text-sm cursor-text hover:border-primary/60 bg-background tabular-nums">
                {fmtCurrency(currentNOIInput)}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium text-muted-foreground">Stabilized NOI ($)</Label>
            {editingNOI === 'stabilized' ? (
              <input autoFocus type="number" value={rawNOI}
                onChange={e => setRawNOI(e.target.value)}
                onBlur={() => { setStabilizedNOI(parseFloat(rawNOI) || 0); setEditingNOI(null) }}
                onKeyDown={e => { if (e.key === 'Enter') { setStabilizedNOI(parseFloat(rawNOI) || 0); setEditingNOI(null) } }}
                className="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background" />
            ) : (
              <div onClick={() => { setRawNOI(String(stabilizedNOI || '')); setEditingNOI('stabilized') }}
                className="w-full border border-input rounded-md px-3 py-2 text-sm cursor-text hover:border-primary/60 bg-background tabular-nums">
                {fmtCurrency(stabilizedNOI)}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Cap Rate Range: {capRange[0].toFixed(2)}% – {capRange[1].toFixed(2)}%
            </Label>
            <Slider
              min={3} max={12} step={0.25}
              value={capRange}
              onValueChange={setCapRange}
              className="mt-2"
            />
          </div>
        </div>
      </div>

      {table.length > 0 && (
        <div className="space-y-4 mt-4">
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs">Cap Rate</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground text-xs">Value (Current NOI)</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground text-xs">Value (Stabilized NOI)</th>
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {table.map((row, idx) => {
                  const isInBand = capBand && row.cap_rate >= capBand.low && row.cap_rate <= capBand.high
                  return (
                    <tr key={idx} className={cn("border-b border-foreground/10", isInBand && "bg-primary/10")}>
                      <td className="px-3 py-2 text-center font-bold">{Number(row.cap_rate).toFixed(2)}%</td>
                      <td className="px-3 py-2 text-right">${Number(row.value_current_noi).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">${Number(row.value_stabilized_noi).toLocaleString()}</td>
                      <td className="px-3 py-1 text-center">
                        <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => toggleLock(idx)}>
                          {row.locked ? <Lock className="w-3 h-3 text-primary" /> : <Unlock className="w-3 h-3 text-muted-foreground" />}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {capBand && (
          <div className="p-3 border border-primary/30 rounded-lg bg-primary/5">
              <div className="text-xs font-medium text-muted-foreground mb-1">Likely Market Cap Band</div>
              <div className="font-bold">{capBand.low}% – {capBand.high}%</div>
              {capBand.rationale && <div className="text-xs text-muted-foreground mt-1">{capBand.rationale}</div>}
            </div>
          )}

          {commentary && (
          <div className="p-3 border border-border rounded-lg bg-muted/20">
              <div className="text-xs font-medium text-muted-foreground mb-1">Pricing Commentary</div>
              <p className="text-sm">{commentary}</p>
            </div>
          )}
        </div>
      )}
    </PhaseCard>
  )
}
