import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Printer } from 'lucide-react'
import { PhaseCard } from '../PhaseCard'
import { UnderwritingPhaseData, useAnalyzePhase, useSavePhaseData } from '@/hooks/useUnderwritings'

interface Props {
  underwritingId: string
  phaseData: UnderwritingPhaseData | undefined
  isComplete: boolean
}

export function Phase6Memo({ underwritingId, phaseData, isComplete }: Props) {
  const analyze = useAnalyzePhase(underwritingId)
  const save = useSavePhaseData(underwritingId)
  const sd = phaseData?.structured_data as Record<string, unknown> | null

  const [text, setText] = useState<string>(
    (sd?.text as string) || phaseData?.raw_perplexity_response || ''
  )

  useEffect(() => {
    if (sd) {
      setText((sd.text as string) || phaseData?.raw_perplexity_response || '')
    }
  }, [phaseData?.structured_data])

  return (
    <PhaseCard
      phaseNumber={6}
      title="Internal Memo"
      description="AI-drafted internal investment memo. Edit inline and export to PDF."
      isComplete={isComplete}
      isAnalyzing={analyze.isPending}
      onAnalyze={() => analyze.mutate(6)}
      analyzeLabel="Draft Memo with Perplexity"
      actions={text && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}
            className="border-2 border-foreground">
            <Printer className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Button size="sm" onClick={() => save.mutate({ phase: 6, structuredData: { text } })}
            disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      )}
    >
      {text && (
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={30}
          className="border-foreground/20 resize-y"
          placeholder="Perplexity-generated memo will appear here…"
        />
      )}
    </PhaseCard>
  )
}
