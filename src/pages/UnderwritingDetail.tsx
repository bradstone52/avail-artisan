import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calculator, Edit2, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  useUnderwriting,
  useUnderwritingDocuments,
  useUnderwritingPhaseData,
  useUpdateUnderwriting,
} from '@/hooks/useUnderwritings'
import { Phase1Tenancy } from '@/components/underwriter/phases/Phase1Tenancy'
import { Phase2Financials } from '@/components/underwriter/phases/Phase2Financials'
import { Phase3Market } from '@/components/underwriter/phases/Phase3Market'
import { Phase4Valuation } from '@/components/underwriter/phases/Phase4Valuation'
import { Phase5Risks } from '@/components/underwriter/phases/Phase5Risks'
import { Phase6Memo } from '@/components/underwriter/phases/Phase6Memo'
import { Phase7OM } from '@/components/underwriter/phases/Phase7OM'
import { cn } from '@/lib/utils'

const PHASE_LABELS = [
  'Tenancy', 'Financials', 'Market', 'Valuation', 'Risks', 'Memo', 'OM Content',
]

export default function UnderwritingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: uw, isLoading } = useUnderwriting(id)
  const { data: documents = [] } = useUnderwritingDocuments(id)
  const { data: phaseRows = [] } = useUnderwritingPhaseData(id)

  const phaseMap = Object.fromEntries(phaseRows.map(p => [p.phase, p]))
  const completion = (uw?.phase_completion as Record<string, boolean>) || {}
  const isPhaseComplete = (n: number) => !!completion[`phase_${n}`]

  // NOI from phase 2 for valuation
  const p2Data = phaseMap[2]?.structured_data as Record<string, Record<string, Record<string, number>>> | null
  const currentNOI = p2Data?.income_statements?.year1?.net_operating_income

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    )
  }

  if (!uw) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-muted-foreground">Underwriting not found.</div>
      </AppLayout>
    )
  }

  const completedCount = Object.values(completion).filter(Boolean).length

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Calculator className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">{uw.property_name}</h1>
              <Badge variant="outline" className="border-foreground/50 text-xs">{uw.submarket}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{uw.address}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {uw.building_size_sf && <span>{Number(uw.building_size_sf).toLocaleString()} SF</span>}
              {uw.year_built && <span>Built {uw.year_built}</span>}
              {uw.proposed_ask_price && <span>Ask: ${Number(uw.proposed_ask_price).toLocaleString()}</span>}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/underwriter')}
            className="border"
          >
            ← Back
          </Button>
        </div>

        {/* Phase progress indicator */}
        <div className="flex items-center gap-2 p-4 border border-border rounded-lg bg-muted/20">
          <span className="text-xs font-medium text-muted-foreground mr-2">
            {completedCount}/7 phases complete
          </span>
          {Array.from({ length: 7 }, (_, i) => {
            const done = isPhaseComplete(i + 1)
            return (
              <div key={i} className="flex items-center">
                <div className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full border-2 text-xs font-semibold",
                  done
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-foreground/40"
                )}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                {i < 6 && <div className={cn("w-6 h-0.5 mx-0.5", done ? "bg-primary" : "bg-foreground/20")} />}
              </div>
            )
          })}
        </div>

        {/* Phase tabs */}
        <Tabs defaultValue="phase-1">
          <TabsList className="flex-wrap h-auto gap-1 mb-4">
            {PHASE_LABELS.map((label, i) => {
              const done = isPhaseComplete(i + 1)
              return (
                <TabsTrigger key={i} value={`phase-${i + 1}`} className="text-xs">
                  {done && <CheckCircle2 className="w-3 h-3 mr-1 text-primary" />}
                  P{i + 1}: {label}
                </TabsTrigger>
              )
            })}
          </TabsList>

          <TabsContent value="phase-1">
            <Phase1Tenancy
              underwritingId={uw.id}
              phaseData={phaseMap[1]}
              documents={documents}
              isComplete={isPhaseComplete(1)}
            />
          </TabsContent>
          <TabsContent value="phase-2">
            <Phase2Financials
              underwritingId={uw.id}
              phaseData={phaseMap[2]}
              isComplete={isPhaseComplete(2)}
            />
          </TabsContent>
          <TabsContent value="phase-3">
            <Phase3Market
              underwritingId={uw.id}
              phaseData={phaseMap[3]}
              isComplete={isPhaseComplete(3)}
            />
          </TabsContent>
          <TabsContent value="phase-4">
            <Phase4Valuation
              underwritingId={uw.id}
              phaseData={phaseMap[4]}
              isComplete={isPhaseComplete(4)}
              currentNOI={currentNOI}
            />
          </TabsContent>
          <TabsContent value="phase-5">
            <Phase5Risks
              underwritingId={uw.id}
              phaseData={phaseMap[5]}
              isComplete={isPhaseComplete(5)}
            />
          </TabsContent>
          <TabsContent value="phase-6">
            <Phase6Memo
              underwritingId={uw.id}
              phaseData={phaseMap[6]}
              isComplete={isPhaseComplete(6)}
            />
          </TabsContent>
          <TabsContent value="phase-7">
            <Phase7OM
              underwritingId={uw.id}
              phaseData={phaseMap[7]}
              isComplete={isPhaseComplete(7)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
