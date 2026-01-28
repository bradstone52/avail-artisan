import { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatCurrency, formatDate } from '@/lib/format';
import { useDeleteDeal } from '@/hooks/useDeals';
import { Eye, Edit, Trash2, Search, X } from 'lucide-react';
import type { Deal } from '@/types/database';

interface DealsTableProps {
  deals: Deal[];
  isLoading?: boolean;
  onEdit?: (deal: Deal) => void;
}

const DEAL_TYPES = ['All', 'Lease', 'Sale'];
const DEAL_STATUSES = ['All', 'Conditional', 'Firm', 'Closed'];

export function DealsTable({ deals, isLoading, onEdit }: DealsTableProps) {
  const navigate = useNavigate();
  const deleteDeal = useDeleteDeal();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const handleDelete = async () => {
    if (deleteId) {
      await deleteDeal.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('All');
    setStatusFilter('All');
  };

  const hasActiveFilters = searchQuery || typeFilter !== 'All' || statusFilter !== 'All';

  // Filter deals
  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          deal.address?.toLowerCase().includes(query) ||
          deal.deal_number?.toLowerCase().includes(query) ||
          deal.city?.toLowerCase().includes(query) ||
          deal.submarket?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Type filter
      if (typeFilter !== 'All' && deal.deal_type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'All' && deal.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [deals, searchQuery, typeFilter, statusFilter]);

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading deals...
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by address, deal #, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {DEAL_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type === 'All' ? 'All Types' : type}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {DEAL_STATUSES.map(status => (
              <SelectItem key={status} value={status}>{status === 'All' ? 'All Statuses' : status}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}

        <div className="text-sm text-muted-foreground ml-auto">
          {filteredDeals.length} of {deals.length} deals
        </div>
      </div>

      {filteredDeals.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          {deals.length === 0 
            ? "No deals found. Create your first deal to get started."
            : "No deals match your filters."
          }
        </div>
      ) : (
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
              {filteredDeals.map((deal) => (
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
      )}

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
