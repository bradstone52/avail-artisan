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
import { formatDate, formatNumber, formatCurrency } from '@/lib/format';
import { useDeleteProspect } from '@/hooks/useProspects';
import { Eye, Pencil, Trash2, Search, X, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO, addDays } from 'date-fns';
import type { Prospect } from '@/types/prospect';

interface ProspectsTableProps {
  prospects: Prospect[];
  isLoading?: boolean;
  onEdit?: (prospect: Prospect) => void;
}

const PROSPECT_TYPES = ['All', 'Tenant', 'Buyer', 'Listing'];
const FOLLOW_UP_FILTERS = ['All', 'Overdue', 'Next 7', 'Next 30'];

const prospectTypeColors: Record<string, string> = {
  Tenant: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  Buyer: 'bg-orange-100 text-orange-800 border-orange-300',
  Listing: 'bg-violet-100 text-violet-800 border-violet-300',
  Landlord: 'bg-violet-100 text-violet-800 border-violet-300',
};

function FollowUpDueCell({ date }: { date?: string | null }) {
  if (!date) return <span className="text-muted-foreground">-</span>;

  const parsed = parseISO(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = differenceInDays(parsed, today);

  if (days < 0) {
    return (
      <span className="text-destructive font-semibold text-xs">
        Overdue by {Math.abs(days)}d
      </span>
    );
  }
  if (days === 0) {
    return <span className="text-warning-foreground font-semibold text-xs">Due today</span>;
  }
  if (days === 1) {
    return <span className="text-xs font-medium">Due tomorrow</span>;
  }
  return <span className="text-xs text-muted-foreground">{formatDate(date)}</span>;
}

function RequirementCell({ prospect }: { prospect: Prospect }) {
  const parts: string[] = [];

  if (prospect.min_size && prospect.max_size) {
    parts.push(`${formatNumber(prospect.min_size)}–${formatNumber(prospect.max_size)} SF`);
  } else if (prospect.max_size) {
    parts.push(`${formatNumber(prospect.max_size)} SF`);
  } else if (prospect.min_size) {
    parts.push(`${formatNumber(prospect.min_size)}+ SF`);
  }

  if (prospect.budget) {
    parts.push(formatCurrency(prospect.budget));
  }

  if (prospect.occupancy_date) {
    parts.push(formatDate(prospect.occupancy_date));
  }

  if (parts.length === 0) return <span className="text-muted-foreground">-</span>;

  return (
    <div className="flex flex-col gap-0.5">
      {parts.map((p, i) => (
        <span key={i} className={cn('text-xs', i === 0 ? 'font-medium' : 'text-muted-foreground')}>
          {p}
        </span>
      ))}
    </div>
  );
}

export function ProspectsTable({ prospects, isLoading, onEdit }: ProspectsTableProps) {
  const navigate = useNavigate();
  const deleteProspect = useDeleteProspect();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [followUpFilter, setFollowUpFilter] = useState('All');

  const handleDelete = async () => {
    if (deleteId) {
      await deleteProspect.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('All');
    setFollowUpFilter('All');
  };

  const hasActiveFilters = searchQuery || typeFilter !== 'All' || followUpFilter !== 'All';

  const filteredAndSorted = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7 = addDays(today, 7);
    const in30 = addDays(today, 30);

    let filtered = prospects.filter(p => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          p.name?.toLowerCase().includes(q) ||
          p.company?.toLowerCase().includes(q) ||
          p.requirements?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (typeFilter !== 'All' && p.prospect_type !== typeFilter) return false;
      if (followUpFilter !== 'All') {
        if (!p.follow_up_date) return false;
        const d = parseISO(p.follow_up_date);
        if (followUpFilter === 'Overdue' && d >= today) return false;
        if (followUpFilter === 'Next 7' && (d < today || d > in7)) return false;
        if (followUpFilter === 'Next 30' && (d < today || d > in30)) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      const dA = a.follow_up_date ? parseISO(a.follow_up_date).getTime() : Infinity;
      const dB = b.follow_up_date ? parseISO(b.follow_up_date).getTime() : Infinity;
      return dA - dB;
    });

    return filtered;
  }, [prospects, searchQuery, typeFilter, followUpFilter]);

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading prospects...
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
            placeholder="Search name, company, requirements..."
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
            {PROSPECT_TYPES.map(t => (
              <SelectItem key={t} value={t}>{t === 'All' ? 'All Types' : t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={followUpFilter} onValueChange={setFollowUpFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Follow-up" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {FOLLOW_UP_FILTERS.map(f => (
              <SelectItem key={f} value={f}>{f === 'All' ? 'All Follow-ups' : f}</SelectItem>
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
          {filteredAndSorted.length} of {prospects.length} prospects
        </div>
      </div>

      {filteredAndSorted.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] bg-card" style={{ borderRadius: 'var(--radius)' }}>
          {prospects.length === 0
            ? "No prospects found. Create your first prospect to get started."
            : "No prospects match your filters."
          }
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Requirement</TableHead>
              <TableHead>Follow-up Due</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.map((prospect, index) => {
              const isSelected = selectedRowId === prospect.id;
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
                  key={prospect.id}
                  className={cn(
                    'cursor-pointer transition-all !border-b-2 !border-foreground',
                    rowBg,
                    hoverClass,
                    outlineClass,
                  )}
                  onClick={() => setSelectedRowId(isSelected ? null : prospect.id)}
                  onDoubleClick={() => navigate(`/prospects/${prospect.id}`)}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{prospect.name}</span>
                      {prospect.company && (
                        <span className="text-xs text-muted-foreground">{prospect.company}</span>
                      )}
                    </div>
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
                    <RequirementCell prospect={prospect} />
                  </TableCell>
                  <TableCell>
                    <FollowUpDueCell date={prospect.follow_up_date} />
                  </TableCell>
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
              );
            })}
          </TableBody>
        </Table>
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
