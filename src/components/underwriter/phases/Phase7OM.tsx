import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Copy, CheckCheck } from 'lucide-react'
import { PhaseCard } from '../PhaseCard'
import { UnderwritingPhaseData, useAnalyzePhase, useSavePhaseData } from '@/hooks/useUnderwritings'

interface Props {
  underwritingId: string
  phaseData: UnderwritingPhaseData | undefined
  isComplete: boolean
}

const OM_SECTIONS = [
  'Executive Summary',
  'Location & Market',
  'Property Features',
  'Tenancy Overview',
  'Financial Summary',
  'Investment Highlights',
]

function parseOMSections(markdown: string): Record<string, string> {
  const result: Record<string, string> = {}
  const parts = markdown.split(/^## /m)
  for (const part of parts) {
    if (!part.trim()) continue
    const lineEnd = part.indexOf('\n')
    const heading = part.slice(0, lineEnd).trim()
    const body = part.slice(lineEnd + 1).trim()
    if (heading) result[heading] = body
  }
  return result
}

export function Phase7OM({ underwritingId, phaseData, isComplete }: Props) {
  const analyze = useAnalyzePhase(underwritingId)
  const save = useSavePhaseData(underwritingId)
  const sd = phaseData?.structured_data as Record<string, unknown> | null

  const rawText = (sd?.text as string) || phaseData?.raw_perplexity_response || ''
  const [sections, setSections] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (rawText) {
      setSections(parseOMSections(rawText))
    }
  }, [rawText])

  const copySection = (key: string) => {
    navigator.clipboard.writeText(sections[key] || '')
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleSave = () => {
    const combined = Object.entries(sections)
      .map(([k, v]) => `## ${k}\n${v}`)
      .join('\n\n')
    save.mutate({ phase: 7, structuredData: { text: combined, sections } })
  }

  const hasSections = Object.keys(sections).length > 0

  return (
    <PhaseCard
      phaseNumber={7}
      title="OM Content"
      description="Marketing copy for the Offering Memorandum. Edit and copy sections."
      isComplete={isComplete}
      isAnalyzing={analyze.isPending}
      onAnalyze={() => analyze.mutate(7)}
      analyzeLabel="Generate OM Text"
      actions={hasSections && (
        <Button size="sm" onClick={handleSave} disabled={save.isPending}
          className="border-2 border-foreground shadow-[2px_2px_0_hsl(var(--foreground))]">
          {save.isPending ? 'Saving…' : 'Save All Sections'}
        </Button>
      )}
    >
      {hasSections && (
        <div className="space-y-6">
          {OM_SECTIONS.map(sectionTitle => {
            // Try to find matching section (fuzzy)
            const matchKey = Object.keys(sections).find(k =>
              k.toLowerCase().includes(sectionTitle.toLowerCase().slice(0, 8))
            ) || sectionTitle
            const content = sections[matchKey] || ''

            return (
              <div key={sectionTitle} className="border-2 border-foreground/20">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-foreground/20">
                  <h4 className="text-xs font-black uppercase tracking-wider">{sectionTitle}</h4>
                  <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => copySection(matchKey)}>
                    {copied === matchKey ? (
                      <CheckCheck className="w-3 h-3 text-primary" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
                <Textarea
                  value={content}
                  onChange={e => setSections(prev => ({ ...prev, [matchKey]: e.target.value }))}
                  rows={5}
                  className="font-mono text-sm border-0 rounded-none resize-y focus-visible:ring-0"
                  placeholder={`${sectionTitle} content…`}
                />
              </div>
            )
          })}
        </div>
      )}
    </PhaseCard>
  )
}
