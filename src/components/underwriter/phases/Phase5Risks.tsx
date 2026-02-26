import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Plus } from 'lucide-react'
import { PhaseCard } from '../PhaseCard'
import { UnderwritingPhaseData, useAnalyzePhase, useSavePhaseData } from '@/hooks/useUnderwritings'

interface Props {
  underwritingId: string
  phaseData: UnderwritingPhaseData | undefined
  isComplete: boolean
}

function EditableList({ title, items, onChange, color }: {
  title: string; items: string[]; onChange: (v: string[]) => void; color: string
}) {
  const add = () => onChange([...items, ''])
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const update = (i: number, v: string) => onChange(items.map((item, idx) => idx === i ? v : item))

  return (
    <div className="flex-1 min-w-0">
      <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${color}`}>{title}</h4>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={`text-sm font-bold ${color}`}>•</span>
            <Input value={item} onChange={e => update(i, e.target.value)}
              className="h-8 text-sm border-foreground/30" placeholder="Add item…" />
            <Button size="icon" variant="ghost" className="w-7 h-7 shrink-0" onClick={() => remove(i)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={add}
          className="border-2 border-dashed border-foreground/30 w-full text-xs">
          <Plus className="w-3 h-3 mr-1" /> Add item
        </Button>
      </div>
    </div>
  )
}

export function Phase5Risks({ underwritingId, phaseData, isComplete }: Props) {
  const analyze = useAnalyzePhase(underwritingId)
  const save = useSavePhaseData(underwritingId)
  const sd = phaseData?.structured_data as Record<string, unknown> | null

  const [risks, setRisks] = useState<string[]>((sd?.risks as string[]) || [])
  const [opps, setOpps] = useState<string[]>((sd?.opportunities as string[]) || [])

  useEffect(() => {
    if (sd) {
      setRisks((sd.risks as string[]) || [])
      setOpps((sd.opportunities as string[]) || [])
    }
  }, [phaseData?.structured_data])

  return (
    <PhaseCard
      phaseNumber={5}
      title="Risks & Upside"
      description="Editable risk and opportunity lists for the investment memo."
      isComplete={isComplete}
      isAnalyzing={analyze.isPending}
      onAnalyze={() => analyze.mutate(5)}
      analyzeLabel="Summarize Risks & Opportunities"
      actions={(risks.length > 0 || opps.length > 0) && (
        <Button size="sm" onClick={() => save.mutate({ phase: 5, structuredData: { risks, opportunities: opps } })}
          disabled={save.isPending} className="border-2 border-foreground shadow-[2px_2px_0_hsl(var(--foreground))]">
          {save.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      )}
    >
      <div className="flex gap-8">
        <EditableList title="Risks" items={risks} onChange={setRisks} color="text-destructive" />
        <EditableList title="Opportunities" items={opps} onChange={setOpps} color="text-primary" />
      </div>
    </PhaseCard>
  )
}
