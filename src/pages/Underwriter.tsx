import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calculator, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/common/PageHeader'
import { UnderwritingListTable } from '@/components/underwriter/UnderwritingListTable'
import { NewUnderwritingDialog } from '@/components/underwriter/NewUnderwritingDialog'
import { useUnderwritings } from '@/hooks/useUnderwritings'

export default function Underwriter() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const navigate = useNavigate()
  const { data: underwritings = [], isLoading } = useUnderwritings()

  return (
    <AppLayout>
      <div className="p-6">
        <PageHeader
          title="Underwriter"
          description="Calgary industrial investment analysis — 7-phase workflow powered by Perplexity"
          icon={Calculator}
          actions={
            <Button
              onClick={() => setDialogOpen(true)}
              className="border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Underwriting
            </Button>
          }
        />

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <UnderwritingListTable underwritings={underwritings} />
        )}
      </div>

      <NewUnderwritingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(id) => navigate(`/underwriter/${id}`)}
      />
    </AppLayout>
  )
}
