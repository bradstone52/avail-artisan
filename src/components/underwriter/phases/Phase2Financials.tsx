import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { PhaseCard } from '../PhaseCard'
import { UnderwritingPhaseData, useAnalyzePhase, useSavePhaseData } from '@/hooks/useUnderwritings'
import { cn } from '@/lib/utils'

interface Props {
  underwritingId: string
  phaseData: UnderwritingPhaseData | undefined
  isComplete: boolean
}

type IncomeStatement = {
  gross_potential_income: number; vacancy_credit_loss: number; effective_gross_income: number
  property_taxes: number; insurance: number; management_fee: number
  maintenance_repairs: number; utilities: number; other_opex: number
  total_operating_expenses: number; net_operating_income: number
}

const ROWS: { key: keyof IncomeStatement; label: string; isNOI?: boolean; isSubtotal?: boolean; readOnly?: boolean }[] = [
  { key: 'gross_potential_income', label: 'Gross Potential Income' },
  { key: 'vacancy_credit_loss', label: 'Vacancy & Credit Loss' },
  { key: 'effective_gross_income', label: 'Effective Gross Income', isSubtotal: true, readOnly: true },
  { key: 'property_taxes', label: 'Property Taxes' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'management_fee', label: 'Management Fee' },
  { key: 'maintenance_repairs', label: 'Maintenance & Repairs' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'other_opex', label: 'Other OpEx' },
  { key: 'total_operating_expenses', label: 'Total Operating Expenses', isSubtotal: true, readOnly: true },
  { key: 'net_operating_income', label: 'Net Operating Income (NOI)', isNOI: true, readOnly: true },
]

const blankIS = (): IncomeStatement => ({
  gross_potential_income: 0, vacancy_credit_loss: 0, effective_gross_income: 0,
  property_taxes: 0, insurance: 0, management_fee: 0, maintenance_repairs: 0,
  utilities: 0, other_opex: 0, total_operating_expenses: 0, net_operating_income: 0,
})

const fmt = (val: number) =>
  '$' + Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Editable cell: shows formatted value, switches to plain number input on focus */
function CurrencyCell({ value, onChange, bold }: { value: number; onChange: (v: number) => void; bold?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState(String(value || ''))

  useEffect(() => { if (!editing) setRaw(String(value || '')) }, [value, editing])

  return editing ? (
    <input
      autoFocus
      type="number"
      value={raw}
      onChange={e => setRaw(e.target.value)}
      onBlur={() => { onChange(parseFloat(raw) || 0); setEditing(false) }}
      onKeyDown={e => { if (e.key === 'Enter') { onChange(parseFloat(raw) || 0); setEditing(false) } }}
      className={cn("h-7 text-xs text-right border border-foreground/30 rounded px-2 w-full bg-background focus:outline-none focus:ring-1 focus:ring-primary", bold && "font-bold")}
    />
  ) : (
    <div
      onClick={() => setEditing(true)}
      className={cn("h-7 text-xs text-right px-2 py-1 border border-foreground/20 rounded cursor-text hover:border-foreground/50 bg-background w-full", bold && "font-bold")}
    >
      {fmt(value)}
    </div>
  )
}

export function Phase2Financials({ underwritingId, phaseData, isComplete }: Props) {
  const analyze = useAnalyzePhase(underwritingId)
  const save = useSavePhaseData(underwritingId)
  const sd = phaseData?.structured_data as Record<string, unknown> | null

  const [year1, setYear1] = useState<IncomeStatement>((sd?.income_statements as Record<string, IncomeStatement>)?.year1 || blankIS())
  const [year2, setYear2] = useState<IncomeStatement>((sd?.income_statements as Record<string, IncomeStatement>)?.year2 || blankIS())
  const [healthBullets, setHealthBullets] = useState<string[]>((sd?.health_bullets as string[]) || [])
  const [ddQuestions, setDdQuestions] = useState<string[]>((sd?.dd_questions as string[]) || [])

  useEffect(() => {
    if (sd) {
      const stmts = sd.income_statements as Record<string, IncomeStatement>
      setYear1(stmts?.year1 || blankIS())
      setYear2(stmts?.year2 || blankIS())
      setHealthBullets((sd.health_bullets as string[]) || [])
      setDdQuestions((sd.dd_questions as string[]) || [])
    }
  }, [phaseData?.structured_data])

  const handleSave = () => {
    save.mutate({ phase: 2, structuredData: { income_statements: { year1, year2 }, health_bullets: healthBullets, dd_questions: ddQuestions } })
  }

  const updateIS = (year: 'year1' | 'year2', key: keyof IncomeStatement, val: number) => {
    if (year === 'year1') setYear1(prev => ({ ...prev, [key]: val }))
    else setYear2(prev => ({ ...prev, [key]: val }))
  }

  const hasData = year1.gross_potential_income > 0 || year2.gross_potential_income > 0

  return (
    <PhaseCard
      phaseNumber={2}
      title="Income & Expenses"
      description="Build a 2-year income statement and calculate NOI from operating statements."
      isComplete={isComplete}
      isAnalyzing={analyze.isPending}
      onAnalyze={() => analyze.mutate(2)}
      actions={hasData && (
        <Button size="sm" onClick={handleSave} disabled={save.isPending}
          className="border-2 border-foreground shadow-[2px_2px_0_hsl(var(--foreground))]">
          {save.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      )}
    >
      {hasData && (
        <div className="space-y-6">
          <div className="border-2 border-foreground overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b-2 border-foreground">
                  <th className="px-4 py-2 text-left font-black uppercase text-xs w-1/2">Line Item</th>
                  <th className="px-4 py-2 text-right font-black uppercase text-xs w-1/4">Year 1 ($)</th>
                  <th className="px-4 py-2 text-right font-black uppercase text-xs w-1/4">Year 2 ($)</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(({ key, label, isNOI, isSubtotal, readOnly }) => (
                  <tr key={key} className={cn(
                    "border-b border-foreground/10",
                    isNOI && "bg-primary/10 border-t-2 border-primary/30",
                    isSubtotal && !isNOI && "bg-muted/50"
                  )}>
                    <td className={cn("px-4 py-2 text-xs", (isNOI || isSubtotal) && "font-bold")}>{label}</td>
                    <td className="px-3 py-1.5 text-right">
                      {readOnly ? (
                        <div className={cn("text-xs text-right px-2 py-1 tabular-nums", (isNOI || isSubtotal) && "font-bold")}>
                          {fmt(year1[key])}
                        </div>
                      ) : (
                        <CurrencyCell value={year1[key]} onChange={v => updateIS('year1', key, v)} />
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {readOnly ? (
                        <div className={cn("text-xs text-right px-2 py-1 tabular-nums", (isNOI || isSubtotal) && "font-bold")}>
                          {fmt(year2[key])}
                        </div>
                      ) : (
                        <CurrencyCell value={year2[key]} onChange={v => updateIS('year2', key, v)} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {healthBullets.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Financial Health</h4>
              <ul className="space-y-1">
                {healthBullets.map((b, i) => <li key={i} className="flex gap-2 text-sm"><span className="text-primary">•</span>{b}</li>)}
              </ul>
            </div>
          )}

          {ddQuestions.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Due Diligence Questions</h4>
              <ol className="space-y-1 list-decimal list-inside">
                {ddQuestions.map((q, i) => <li key={i} className="text-sm text-muted-foreground">{q}</li>)}
              </ol>
            </div>
          )}
        </div>
      )}
    </PhaseCard>
  )
}
