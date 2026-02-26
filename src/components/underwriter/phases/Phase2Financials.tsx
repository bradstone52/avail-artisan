import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

const ROWS: { key: keyof IncomeStatement; label: string; isNOI?: boolean; isSubtotal?: boolean }[] = [
  { key: 'gross_potential_income', label: 'Gross Potential Income' },
  { key: 'vacancy_credit_loss', label: 'Vacancy & Credit Loss' },
  { key: 'effective_gross_income', label: 'Effective Gross Income', isSubtotal: true },
  { key: 'property_taxes', label: 'Property Taxes' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'management_fee', label: 'Management Fee' },
  { key: 'maintenance_repairs', label: 'Maintenance & Repairs' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'other_opex', label: 'Other OpEx' },
  { key: 'total_operating_expenses', label: 'Total Operating Expenses', isSubtotal: true },
  { key: 'net_operating_income', label: 'Net Operating Income (NOI)', isNOI: true },
]

const blankIS = (): IncomeStatement => ({
  gross_potential_income: 0, vacancy_credit_loss: 0, effective_gross_income: 0,
  property_taxes: 0, insurance: 0, management_fee: 0, maintenance_repairs: 0,
  utilities: 0, other_opex: 0, total_operating_expenses: 0, net_operating_income: 0,
})

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
    >
      {hasData && (
        <div className="space-y-6">
          <div className="overflow-x-auto border-2 border-foreground">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b-2 border-foreground">
                  <th className="px-3 py-2 text-left font-black uppercase text-xs">Line Item</th>
                  <th className="px-3 py-2 text-right font-black uppercase text-xs">Year 1 ($)</th>
                  <th className="px-3 py-2 text-right font-black uppercase text-xs">Year 2 ($)</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(({ key, label, isNOI, isSubtotal }) => (
                  <tr key={key} className={cn(
                    "border-b border-foreground/10",
                    isNOI && "bg-primary/10 border-t-2 border-primary/30",
                    isSubtotal && "bg-muted/50"
                  )}>
                    <td className={cn("px-3 py-1.5 text-xs", (isNOI || isSubtotal) && "font-bold")}>{label}</td>
                    <td className="px-3 py-1 text-right">
                      <Input
                        value={year1[key] || ''}
                        type="number"
                        onChange={e => updateIS('year1', key, +e.target.value)}
                        className={cn("h-7 text-xs text-right border-foreground/20 w-28 ml-auto", isNOI && "font-bold")}
                      />
                    </td>
                    <td className="px-3 py-1 text-right">
                      <Input
                        value={year2[key] || ''}
                        type="number"
                        onChange={e => updateIS('year2', key, +e.target.value)}
                        className={cn("h-7 text-xs text-right border-foreground/20 w-28 ml-auto", isNOI && "font-bold")}
                      />
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
