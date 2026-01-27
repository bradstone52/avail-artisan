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
import { formatCurrency, formatDate } from '@/lib/format';
import { useDeleteDeal } from '@/hooks/useDeals';
import { Eye, Edit, Trash2 } from 'lucide-react';
import type { Deal } from '@/types/database';

interface DealsTableProps {
  deals: Deal[];
  isLoading?: boolean;
  onEdit?: (deal: Deal) => void;
}

export function DealsTable({ deals, isLoading, onEdit }: DealsTableProps) {
  const navigate = useNavigate();
  const deleteDeal = useDeleteDeal();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteDeal.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading deals...
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No deals found. Create your first deal to get started.
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deal #</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Close Date</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((deal) => (
              <TableRow key={deal.id}>
                <TableCell className="font-medium">
                  {deal.deal_number || '-'}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{deal.address}</div>
                    <div className="text-sm text-muted-foreground">
                      {deal.city}{deal.submarket && `, ${deal.submarket}`}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{deal.deal_type}</TableCell>
                <TableCell>
                  <StatusBadge status={deal.status} />
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(deal.deal_value)}
                </TableCell>
                <TableCell>{formatDate(deal.close_date)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => navigate(`/deals/${deal.id}`)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => onEdit(deal)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(deal.id)}
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
        title="Delete Deal"
        description="Are you sure you want to delete this deal? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
