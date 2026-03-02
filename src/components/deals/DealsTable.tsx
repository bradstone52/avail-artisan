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
import { ColumnsDropdown } from '@/components/common/ColumnsDropdown';
import { DensityToggle } from '@/components/common/DensityToggle';
import { formatCurrency, formatDate } from '@/lib/format';
import { useDeleteDeal } from '@/hooks/useDeals';
import { useTableColumnPrefs } from '@/hooks/useTableColumnPrefs';
import { useTableDensity } from '@/hooks/useTableDensity';
import { Eye, Pencil, Trash2, Search, X, MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO } from 'date-fns';
import type { Deal } from '@/types/database';
import type { DealImportantDate } from '@/hooks/useAllDealImportantDates';

interface DealsTableProps {
  deals: Deal[];
  isLoading?: boolean;
  onEdit?: (deal: Deal) => void;
  importantDates?: DealImportantDate[];
}

const DEAL_TYPES = ['All', 'Lease', 'Sale'];
const DEAL_STATUSES = ['All', 'Conditional', 'Firm', 'Closed'];
const SORT_OPTIONS = [
  { value: 'milestone', label: 'Next milestone' },
  { value: 'close_date', label: 'Close date' },
  { value: 'value', label: 'Value' },
];

const DEALS_COLUMNS = [
  { id: 'deal_number', label: 'Deal #', defaultVisible: true },
  { id: 'address', label: 'Address', defaultVisible: true },
  { id: 'type', label: 'Type', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: true },
  { id: 'milestone', label: 'Next Milestone', defaultVisible: true },
  { id: 'value', label: 'Value', defaultVisible: true },
  { id: 'close_date', label: 'Close Date', defaultVisible: true },
];

const statusColors: Record<string, string> = {
  Conditional: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Firm: 'bg-green-100 text-green-800 border-green-300',
  Closed: 'bg-blue-100 text-blue-800 border-blue-300',
};

const dealTypeColors: Record<string, string> = {
  Lease: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  Sale: 'bg-orange-100 text-orange-800 border-orange-300',
};

function getNextMilestone(dealId: string, importantDates?: DealImportantDate[]) {
  if (!importantDates) return null;
  const dealDates = importantDates.filter(d => d.dealId === dealId);
  if (dealDates.length === 0) return null;
  dealDates.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  return dealDates[0];
}

function MilestoneCell({ milestone }: { milestone: DealImportantDate | null }) {
  if (!milestone) return <span className="text-muted-foreground">-</span>;

  const date = parseISO(milestone.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = differenceInDays(date, today);
  const isOverdue = days < 0;

  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn(
        'text-xs font-medium truncate max-w-[180px]',
        isOverdue && 'text-destructive'
      )}>
        {milestone.label}
      </span>
      <span className={cn(
        'text-[11px]',
        isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'
      )}>
        {isOverdue
          ? `Overdue by ${Math.abs(days)}d`
          : days === 0
            ? 'Today'
            : `In ${days}d`
        }
      </span>
    </div>
  );
}

export function DealsTable({ deals, isLoading, onEdit, importantDates }: DealsTableProps) {
  const navigate = useNavigate();
  const deleteDeal = useDeleteDeal();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('milestone');

  const { isVisible, toggle, reset, columns } = useTableColumnPrefs('deals', DEALS_COLUMNS);
  const { density, toggle: toggleDensity, isCompact } = useTableDensity('deals');
  const cellPadding = isCompact ? 'py-1 text-xs' : '';
  const headPadding = isCompact ? 'py-1.5 text-xs' : '';

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

  const milestoneMap = useMemo(() => {
    const map = new Map<string, DealImportantDate | null>();
    deals.forEach(deal => {
      map.set(deal.id, getNextMilestone(deal.id, importantDates));
    });
    return map;
  }, [deals, importantDates]);

  const filteredAndSortedDeals = useMemo(() => {
    let filtered = deals.filter(deal => {
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

    filtered.sort((a, b) => {
      if (sortBy === 'milestone') {
        const mA = milestoneMap.get(a.id);
        const mB = milestoneMap.get(b.id);
        const dateA = mA ? parseISO(mA.date).getTime() : Infinity;
        const dateB = mB ? parseISO(mB.date).getTime() : Infinity;
        return dateA - dateB;
      }
      if (sortBy === 'close_date') {
        const dA = a.close_date ? parseISO(a.close_date).getTime() : Infinity;
        const dB = b.close_date ? parseISO(b.close_date).getTime() : Infinity;
        return dA - dB;
      }
      if (sortBy === 'value') {
        return (b.deal_value || b.lease_value || 0) - (a.deal_value || a.lease_value || 0);
      }
      return 0;
    });

    return filtered;
  }, [deals, searchQuery, typeFilter, statusFilter, sortBy, milestoneMap]);

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading deals...
      </div>
    );
  }

  const visibleCount = columns.filter(c => isVisible(c.id)).length;

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

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px]">
            <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {SORT_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ColumnsDropdown columns={columns} isVisible={isVisible} toggle={toggle} reset={reset} />
        <DensityToggle density={density} toggle={toggleDensity} />

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}

        <div className="text-sm text-muted-foreground ml-auto">
          {filteredAndSortedDeals.length} of {deals.length} deals
        </div>
      </div>

      {filteredAndSortedDeals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-border shadow-sm bg-card rounded-lg">
          {deals.length === 0 
            ? "No deals found. Create your first deal to get started."
            : "No deals match your filters."
          }
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {isVisible('deal_number') && <TableHead className={headPadding}>Deal #</TableHead>}
              {isVisible('address') && <TableHead className={headPadding}>Address</TableHead>}
              {isVisible('type') && <TableHead className={headPadding}>Type</TableHead>}
              {isVisible('status') && <TableHead className={headPadding}>Status</TableHead>}
              {isVisible('milestone') && <TableHead className={headPadding}>Next Milestone</TableHead>}
              {isVisible('value') && <TableHead className={cn('text-right', headPadding)}>Value</TableHead>}
              {isVisible('close_date') && <TableHead className={headPadding}>Close Date</TableHead>}
              <TableHead className={cn('w-[60px]', headPadding)}></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedDeals.map((deal, index) => {
              const isSelected = selectedRowId === deal.id;
              const isEvenRow = index % 2 === 1;
              const rowBg = isSelected
                ? '!bg-blue-50 dark:!bg-blue-950/30'
                : isEvenRow
                  ? 'bg-table-stripe'
                  : '';
              const hoverClass = isSelected
                ? 'hover:!bg-blue-100 dark:hover:!bg-blue-950/40'
                : isEvenRow
                  ? 'hover:!bg-slate-100 dark:hover:!bg-slate-800/60'
                  : 'hover:!bg-slate-50 dark:hover:!bg-slate-800/40';
              const outlineClass = isSelected
                ? 'outline outline-2 outline-blue-400 dark:outline-blue-500 -outline-offset-1'
                : 'outline-0 hover:outline hover:outline-1 hover:outline-slate-300 dark:hover:outline-slate-600 hover:-outline-offset-1';

              const milestone = milestoneMap.get(deal.id) ?? null;

              return (
                <TableRow
                  key={deal.id}
                  className={cn(
                    'cursor-pointer transition-all !border-b !border-border',
                    rowBg,
                    hoverClass,
                    outlineClass,
                  )}
                  onClick={() => setSelectedRowId(isSelected ? null : deal.id)}
                  onDoubleClick={() => navigate(`/deals/${deal.id}`)}
                >
                  {isVisible('deal_number') && (
                    <TableCell className={cn('font-medium', cellPadding)}>
                      {deal.deal_number || '-'}
                    </TableCell>
                  )}
                  {isVisible('address') && (
                    <TableCell className={cellPadding}>
                      <div className="flex flex-col">
                        <span className="font-medium">{deal.address}</span>
                        {!isCompact && (
                          <span className="text-xs text-muted-foreground">
                            {deal.city}{deal.submarket && `, ${deal.submarket}`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {isVisible('type') && (
                    <TableCell className={cellPadding}>
                      <Badge
                        variant="outline"
                        className={`font-medium border ${dealTypeColors[deal.deal_type] || ''}`}
                      >
                        {deal.deal_type}
                      </Badge>
                    </TableCell>
                  )}
                  {isVisible('status') && (
                    <TableCell className={cellPadding}>
                      <Badge
                        variant="outline"
                        className={`font-medium border ${statusColors[deal.status] || ''}`}
                      >
                        {deal.status}
                      </Badge>
                    </TableCell>
                  )}
                  {isVisible('milestone') && (
                    <TableCell className={cellPadding}>
                      <MilestoneCell milestone={milestone} />
                    </TableCell>
                  )}
                  {isVisible('value') && (
                    <TableCell className={cn('text-right font-mono', cellPadding)}>
                      {formatCurrency(deal.deal_value)}
                    </TableCell>
                  )}
                  {isVisible('close_date') && (
                    <TableCell className={cellPadding}>{formatDate(deal.close_date)}</TableCell>
                  )}
                  <TableCell className={cellPadding}>
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
