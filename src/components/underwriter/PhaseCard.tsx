import { ReactNode, useEffect } from 'react'
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PhaseCardProps {
  phaseNumber: number
  title: string
  description: string
  isComplete: boolean
  isAnalyzing: boolean
  isBackgroundAnalyzing?: boolean
  onAnalyze: () => void
  analyzeLabel?: string
  children?: ReactNode
  documents?: ReactNode
  actions?: ReactNode
}

export function PhaseCard({
  phaseNumber,
  title,
  description,
  isComplete,
  isAnalyzing,
  isBackgroundAnalyzing = false,
  onAnalyze,
  analyzeLabel = 'Analyze with Perplexity',
  children,
  documents,
  actions,
}: PhaseCardProps) {
  const busy = isAnalyzing || isBackgroundAnalyzing
  return (
    <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
      <CardHeader className="border-b-2 border-foreground/20 bg-muted/30 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full border-2 border-foreground flex items-center justify-center text-sm font-black",
              isComplete ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
            )}>
              {isComplete ? <CheckCircle2 className="w-5 h-5" /> : phaseNumber}
            </div>
            <div>
              <CardTitle className="text-base font-black uppercase tracking-wide">
                Phase {phaseNumber} – {title}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isComplete && (
              <Badge className="bg-primary text-primary-foreground text-xs">Complete</Badge>
            )}
            <Button
              size="sm"
              onClick={onAnalyze}
              disabled={busy}
              className="border-2 border-foreground shadow-[2px_2px_0_hsl(var(--foreground))] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isBackgroundAnalyzing ? 'Analyzing docs…' : 'Starting…'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {analyzeLabel}
                </>
              )}
            </Button>
          </div>
        </div>
        {isBackgroundAnalyzing && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-foreground/20 rounded px-3 py-2">
            <Loader2 className="w-3 h-3 animate-spin shrink-0" />
            <span>Reading your documents and extracting data — this may take 1–3 minutes. The page will update automatically when complete.</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {documents && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Documents</h4>
            {documents}
          </div>
        )}
        {children && <div>{children}</div>}
        {actions && (
          <div className="flex justify-end pt-2 border-t border-foreground/10">
            {actions}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
