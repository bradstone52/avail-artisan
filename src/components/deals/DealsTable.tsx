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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatCurrency, formatDate } from '@/lib/format';
import { useDeleteDeal } from '@/hooks/useDeals';
import { Eye, Pencil, Trash2, Search, X, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Deal } from '@/types/database';

interface DealsTableProps {
  deals: Deal[];
  isLoading?: boolean;
  onEdit?: (deal: Deal) => void;
}

const DEAL_TYPES = ['All', 'Lease', 'Sale'];
const DEAL_STATUSES = ['All', 'Conditional', 'Firm', 'Closed'];

const statusColors: Record<string, string> = {
  Conditional: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Firm: 'bg-green-100 text-green-800 border-green-300',
  Closed: 'bg-blue-100 text-blue-800 border-blue-300',
};

const dealTypeColors: Record<string, string> = {
  Lease: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  Sale: 'bg-orange-100 text-orange-800 border-orange-300',
};

export function DealsTable({ deals, isLoading, onEdit }: DealsTableProps) {
  const navigate = useNavigate();
  const deleteDeal = useDeleteDeal();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  
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

  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          deal.address?.toLowerCase().includes(query) ||
          deal.deal_number?.toLowerCase().includes(query) ||
          deal.city?.toLowerCase().includes(query) ||
          deal.submarket?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      if (typeFilter !== 'All' && deal.deal_type !== typeFilter) return false;
      if (statusFilter !== 'All' && deal.status !== statusFilter) return false;
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
        <div className="text-center py-12 text-muted-foreground border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] bg-card" style={{ borderRadius: 'var(--radius)' }}>
          {deals.length === 0 
            ? "No deals found. Create your first deal to get started."
            : "No deals match your filters."
          }
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deal #</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Close Date</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDeals.map((deal, index) => {
              const isSelected = selectedRowId === deal.id;
              const isEvenRow = index % 2 === 1;
              const rowBg = isSelected
                ? '!bg-secondary'
                : isEvenRow
                  ? 'bg-table-stripe'
                  : '';
              const hoverClass = isSelected
                ? 'hover:!bg-secondary/90'
                : isEvenRow
                  ? 'hover:!bg-pink-300 dark:hover:!bg-pink-800'
                  : 'hover:!bg-pink-200 dark:hover:!bg-pink-900/50';
              const outlineClass = isSelected
                ? 'outline outline-2 outline-amber-600 dark:outline-amber-500 -outline-offset-1'
                : 'outline-0 hover:outline hover:outline-2 hover:outline-pink-500 dark:hover:outline-pink-400 hover:-outline-offset-1';

              return (
                <TableRow
                  key={deal.id}
                  className={cn(
                    'cursor-pointer transition-all !border-b-2 !border-foreground',
                    rowBg,
                    hoverClass,
                    outlineClass,
                  )}
                  onClick={() => setSelectedRowId(isSelected ? null : deal.id)}
                  onDoubleClick={() => navigate(`/deals/${deal.id}`)}
                >
                  <TableCell className="font-medium">
                    {deal.deal_number || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{deal.address}</span>
                      <span className="text-xs text-muted-foreground">
                        {deal.city}{deal.submarket && `, ${deal.submarket}`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`font-medium border ${dealTypeColors[deal.deal_type] || ''}`}
                    >
                      {deal.deal_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`font-medium border ${statusColors[deal.status] || ''}`}
                    >
                      {deal.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(deal.deal_value)}
                  </TableCell>
                  <TableCell>{formatDate(deal.close_date)}</TableCell>
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
                            navigate(`/deals/${deal.id}`);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {onEdit && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(deal);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(deal.id);
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
              );
            })}
          </TableBody>
        </Table>
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
