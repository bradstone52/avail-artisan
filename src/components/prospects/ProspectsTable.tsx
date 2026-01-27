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
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatDate, formatNumber, formatCurrency } from '@/lib/format';
import { useDeleteProspect } from '@/hooks/useProspects';
import { Eye, Edit, Trash2 } from 'lucide-react';
import type { Prospect } from '@/types/prospect';

interface ProspectsTableProps {
  prospects: Prospect[];
  isLoading?: boolean;
  onEdit?: (prospect: Prospect) => void;
}

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

  if (prospects.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No prospects found. Create your first prospect to get started.
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Size Range</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Follow-up</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prospects.map((prospect) => (
              <TableRow key={prospect.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{prospect.name}</div>
                    {prospect.email && (
                      <div className="text-sm text-muted-foreground">{prospect.email}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{prospect.company || '-'}</TableCell>
                <TableCell>
                  <StatusBadge status={prospect.status} />
                </TableCell>
                <TableCell>
                  {prospect.min_size || prospect.max_size ? (
                    `${prospect.min_size ? formatNumber(prospect.min_size) : '0'} - ${prospect.max_size ? formatNumber(prospect.max_size) : '∞'} SF`
                  ) : '-'}
                </TableCell>
                <TableCell>{formatCurrency(prospect.budget)}</TableCell>
                <TableCell>{formatDate(prospect.follow_up_date)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => navigate(`/prospects/${prospect.id}`)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => onEdit(prospect)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(prospect.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
