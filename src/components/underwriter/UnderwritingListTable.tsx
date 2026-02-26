import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Eye, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Underwriting } from '@/hooks/useUnderwritings'
import { cn } from '@/lib/utils'

interface Props {
  underwritings: Underwriting[]
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  in_progress: 'bg-secondary text-secondary-foreground',
  complete: 'bg-primary text-primary-foreground',
}

function PhaseDots({ completion }: { completion: Record<string, boolean> }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 7 }, (_, i) => {
        const done = completion[`phase_${i + 1}`]
        return (
          <div
            key={i}
            title={`Phase ${i + 1}`}
            className={cn(
              "w-3 h-3 rounded-full border border-foreground/30",
              done ? "bg-primary" : "bg-muted"
            )}
          />
        )
      })}
    </div>
  )
}

export function UnderwritingListTable({ underwritings }: Props) {
  const navigate = useNavigate()

  if (underwritings.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="font-bold text-lg">No underwritings yet</p>
        <p className="text-sm mt-1">Click "New Underwriting" to get started</p>
      </div>
    )
  }

  return (
    <div className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b-2 border-foreground bg-muted/50">
            <TableHead className="font-black uppercase text-xs">Property</TableHead>
            <TableHead className="font-black uppercase text-xs">Address</TableHead>
            <TableHead className="font-black uppercase text-xs">Submarket</TableHead>
            <TableHead className="font-black uppercase text-xs text-right">Size SF</TableHead>
            <TableHead className="font-black uppercase text-xs">Status</TableHead>
            <TableHead className="font-black uppercase text-xs">Phases</TableHead>
            <TableHead className="font-black uppercase text-xs">Created</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {underwritings.map((uw) => (
            <TableRow
              key={uw.id}
              className="border-b border-foreground/10 cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => navigate(`/underwriter/${uw.id}`)}
            >
              <TableCell className="font-bold">{uw.property_name}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                {uw.address}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="border-foreground/50 text-xs">
                  {uw.submarket}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-sm">
                {uw.building_size_sf
                  ? Number(uw.building_size_sf).toLocaleString()
                  : '—'}
              </TableCell>
              <TableCell>
                <Badge className={cn('text-xs border-0', STATUS_COLORS[uw.status] || STATUS_COLORS.draft)}>
                  {uw.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <PhaseDots completion={uw.phase_completion || {}} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {format(new Date(uw.created_at), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8"
                  onClick={(e) => { e.stopPropagation(); navigate(`/underwriter/${uw.id}`) }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
