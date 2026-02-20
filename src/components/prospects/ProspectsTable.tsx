import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatDate, formatNumber } from '@/lib/format';
import { useDeleteProspect } from '@/hooks/useProspects';
import { Eye, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import type { Prospect } from '@/types/prospect';

interface ProspectsTableProps {
  prospects: Prospect[];
  isLoading?: boolean;
  onEdit?: (prospect: Prospect) => void;
}

const prospectTypeColors: Record<string, string> = {
  Tenant: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  Buyer: 'bg-orange-100 text-orange-800 border-orange-300',
  Landlord: 'bg-violet-100 text-violet-800 border-violet-300',
};

const sourceColors: Record<string, string> = {
  Referral: 'bg-green-100 text-green-800 border-green-300',
  'Cold Call': 'bg-blue-100 text-blue-800 border-blue-300',
  Website: 'bg-purple-100 text-purple-800 border-purple-300',
  'Walk-in': 'bg-yellow-100 text-yellow-800 border-yellow-300',
};

export function ProspectsTable({ prospects, isLoading, onEdit }: ProspectsTableProps) {
  const navigate = useNavigate();
  const deleteProspect = useDeleteProspect();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteProspect.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading prospects...
      </div>
    );
  }

  return (
    <>
      {prospects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] bg-card" style={{ borderRadius: 'var(--radius)' }}>
          No prospects found. Create your first prospect to get started.
        </div>
      ) : (
        <div className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] bg-card overflow-hidden" style={{ borderRadius: 'var(--radius)' }}>
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-foreground bg-muted/50">
                <TableHead className="font-bold uppercase text-xs tracking-wider">Name</TableHead>
                <TableHead className="font-bold uppercase text-xs tracking-wider">Type</TableHead>
                <TableHead className="font-bold uppercase text-xs tracking-wider">Source</TableHead>
                <TableHead className="font-bold uppercase text-xs tracking-wider text-right">Required Size</TableHead>
                <TableHead className="font-bold uppercase text-xs tracking-wider">Follow-up</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prospects.map((prospect) => (
                <TableRow
                  key={prospect.id}
                  className="border-b border-foreground/20 hover:bg-muted/30 cursor-pointer"
                  onClick={() => navigate(`/prospects/${prospect.id}`)}
                >
                  <TableCell>
                    <span className="font-medium">{prospect.name}</span>
                  </TableCell>
                  <TableCell>
                    {prospect.prospect_type ? (
                      <Badge
                        variant="outline"
                        className={`font-medium border ${prospectTypeColors[prospect.prospect_type] || ''}`}
                      >
                        {prospect.prospect_type}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {prospect.source ? (
                      <Badge
                        variant="outline"
                        className={`font-medium border ${sourceColors[prospect.source] || ''}`}
                      >
                        {prospect.source}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {prospect.max_size ? `${formatNumber(prospect.max_size)} SF` : '-'}
                  </TableCell>
                  <TableCell>{formatDate(prospect.follow_up_date)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/prospects/${prospect.id}`);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {onEdit && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(prospect);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(prospect.id);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Prospect"
        description="Are you sure you want to delete this prospect? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
