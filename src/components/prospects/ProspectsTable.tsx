import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ColumnsDropdown } from '@/components/common/ColumnsDropdown';
import { DensityToggle } from '@/components/common/DensityToggle';
import { formatDate, formatNumber, formatCurrency } from '@/lib/format';
import { useDeleteProspect, useLogProspectContact, useUpdateProspect } from '@/hooks/useProspects';
import { useTableColumnPrefs } from '@/hooks/useTableColumnPrefs';
import { useTableDensity } from '@/hooks/useTableDensity';
import { Eye, Pencil, Trash2, Search, X, MoreHorizontal, Phone, Mail, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO, addDays, formatDistanceToNow } from 'date-fns';
import type { Prospect } from '@/types/prospect';

interface ProspectsTableProps {
  prospects: Prospect[];
  isLoading?: boolean;
  onEdit?: (prospect: Prospect) => void;
}

const PROSPECT_TYPES = ['All', 'Tenant', 'Buyer', 'Listing'];
const FOLLOW_UP_FILTERS = ['All', 'Overdue', 'Next 7', 'Next 30'];
const PRIORITY_FILTERS = ['All', 'A', 'B', 'C'];

const PROSPECTS_COLUMNS = [
  { id: 'name', label: 'Name', defaultVisible: true },
  { id: 'priority', label: 'Priority', defaultVisible: true },
  { id: 'type', label: 'Type', defaultVisible: true },
  { id: 'requirement', label: 'Requirement', defaultVisible: true },
  { id: 'last_contacted', label: 'Last Contacted', defaultVisible: true },
  { id: 'follow_up', label: 'Follow-up Due', defaultVisible: true },
];

const prospectTypeColors: Record<string, string> = {
  Tenant: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  Buyer: 'bg-orange-100 text-orange-800 border-orange-300',
  Listing: 'bg-violet-100 text-violet-800 border-violet-300',
  Landlord: 'bg-violet-100 text-violet-800 border-violet-300',
};

// A = highest priority, C = lowest
const PRIORITY_CYCLE = [null, 'A', 'B', 'C'] as const;
const priorityOrder: Record<string, number> = { A: 0, B: 1, C: 2 };

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

function LastContactedCell({ date, prospectId, prospectName }: { date?: string | null; prospectId: string; prospectName: string }) {
  const logContact = useLogProspectContact();

  let label: React.ReactNode;
  if (!date) {
    label = <span className="text-muted-foreground text-xs">Never</span>;
  } else {
    const d = parseISO(date);
    const daysAgo = differenceInDays(new Date(), d);
    if (daysAgo === 0) {
      label = <span className="text-xs text-success-foreground font-medium">Today</span>;
    } else {
      label = <span className="text-xs text-muted-foreground">{formatDistanceToNow(d, { addSuffix: true })}</span>;
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {label}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
        title={`Log contact for ${prospectName}`}
        onClick={(e) => {
          e.stopPropagation();
          logContact.mutate(prospectId);
        }}
        disabled={logContact.isPending}
      >
        <Phone className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
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
  const updateProspect = useUpdateProspect();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [updatingPriority, setUpdatingPriority] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [followUpFilter, setFollowUpFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Sort state: 'priority' | 'follow_up' | null, direction asc/desc
  type SortCol = 'priority' | 'follow_up';
  const [sortCol, setSortCol] = useState<SortCol>('priority');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSortClick = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const handleSetPriority = async (prospect: Prospect, value: string | null) => {
    setUpdatingPriority(prospect.id);
    try {
      await (updateProspect as any).mutateAsync({
        id: prospect.id,
        name: prospect.name,
        priority: value,
      });
    } finally {
      setUpdatingPriority(null);
    }
  };

  const { isVisible, toggle, reset, columns } = useTableColumnPrefs('prospects', PROSPECTS_COLUMNS);
  const { density, toggle: toggleDensity, isCompact } = useTableDensity('prospects');
  const cellPadding = isCompact ? 'py-1 text-xs' : '';
  const headPadding = isCompact ? 'py-1.5 text-xs' : '';

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
    setPriorityFilter('All');
  };

  const hasActiveFilters = searchQuery || typeFilter !== 'All' || followUpFilter !== 'All' || priorityFilter !== 'All';

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
          p.email?.toLowerCase().includes(q) ||
          p.phone?.toLowerCase().includes(q) ||
          p.requirements?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (typeFilter !== 'All' && p.prospect_type !== typeFilter) return false;
      if (priorityFilter !== 'All' && p.priority !== priorityFilter) return false;
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
      let cmp = 0;
      if (sortCol === 'priority') {
        const pA = a.priority ? (priorityOrder[a.priority] ?? 3) : 3;
        const pB = b.priority ? (priorityOrder[b.priority] ?? 3) : 3;
        cmp = pA - pB;
        if (cmp === 0) {
          const dA = a.follow_up_date ? parseISO(a.follow_up_date).getTime() : Infinity;
          const dB = b.follow_up_date ? parseISO(b.follow_up_date).getTime() : Infinity;
          cmp = dA - dB;
        }
      } else {
        const dA = a.follow_up_date ? parseISO(a.follow_up_date).getTime() : Infinity;
        const dB = b.follow_up_date ? parseISO(b.follow_up_date).getTime() : Infinity;
        cmp = dA - dB;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [prospects, searchQuery, typeFilter, followUpFilter, priorityFilter, sortCol, sortDir]);

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
            placeholder="Search name, company, email..."
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

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {PRIORITY_FILTERS.map(p => (
              <SelectItem key={p} value={p}>{p === 'All' ? 'All Priorities' : p}</SelectItem>
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

        <ColumnsDropdown columns={columns} isVisible={isVisible} toggle={toggle} reset={reset} />
        <DensityToggle density={density} toggle={toggleDensity} />

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
              {isVisible('name') && <TableHead className={headPadding}>Name</TableHead>}
              {isVisible('priority') && (
                <TableHead className={cn('cursor-pointer select-none', headPadding)} onClick={() => handleSortClick('priority')}>
                  <div className="flex items-center gap-1">
                    Priority
                    {sortCol === 'priority'
                      ? sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      : <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    }
                  </div>
                </TableHead>
              )}
              {isVisible('type') && <TableHead className={headPadding}>Type</TableHead>}
              {isVisible('requirement') && <TableHead className={headPadding}>Requirement</TableHead>}
              {isVisible('last_contacted') && <TableHead className={headPadding}>Last Contacted</TableHead>}
              {isVisible('follow_up') && (
                <TableHead className={cn('cursor-pointer select-none', headPadding)} onClick={() => handleSortClick('follow_up')}>
                  <div className="flex items-center gap-1">
                    Follow-up Due
                    {sortCol === 'follow_up'
                      ? sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      : <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    }
                  </div>
                </TableHead>
              )}
              <TableHead className={cn('w-[60px]', headPadding)}></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr:nth-child(even)]:bg-transparent">
            {filteredAndSorted.map((prospect, index) => {
              const isSelected = selectedRowId === prospect.id;
              const isEven = index % 2 === 0;
              const priorityRowBg =
                prospect.priority === 'A'
                  ? isEven ? 'bg-red-50 dark:bg-red-950/20' : 'bg-red-200/60 dark:bg-red-900/40'
                  : prospect.priority === 'B'
                  ? isEven ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'bg-yellow-200/60 dark:bg-yellow-900/40'
                  : prospect.priority === 'C'
                  ? isEven ? 'bg-cyan-50 dark:bg-cyan-950/20' : 'bg-cyan-200/60 dark:bg-cyan-900/40'
                  : isEven ? 'bg-background' : 'bg-muted/40';
              const rowBg = isSelected ? '!bg-secondary' : priorityRowBg;
              const hoverClass = isSelected
                ? 'hover:!bg-secondary/90'
                : prospect.priority === 'A'
                  ? 'hover:!bg-red-200/80 dark:hover:!bg-red-900/40'
                  : prospect.priority === 'B'
                    ? 'hover:!bg-yellow-200/80 dark:hover:!bg-yellow-900/40'
                    : prospect.priority === 'C'
                      ? 'hover:!bg-cyan-200/80 dark:hover:!bg-cyan-900/40'
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
                  {isVisible('name') && (
                    <TableCell className={cellPadding}>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{prospect.name}</span>
                        {!isCompact && prospect.company && (
                          <span className="text-xs text-muted-foreground">{prospect.company}</span>
                        )}
                        {!isCompact && (
                          <div className="flex items-center gap-2 mt-0.5">
                            {prospect.phone && (
                              <a
                                href={`tel:${prospect.phone}`}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="h-3 w-3" />
                                {prospect.phone}
                              </a>
                            )}
                            {prospect.email && (
                              <a
                                href={`mailto:${prospect.email}`}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Mail className="h-3 w-3" />
                                {prospect.email}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {isVisible('priority') && (
                    <TableCell className={cellPadding}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={updatingPriority === prospect.id}
                            className={cn(
                              'px-2 py-1 text-xs font-bold uppercase border-2 border-foreground transition-all disabled:opacity-50 shadow-[2px_2px_0_hsl(var(--foreground))] flex items-center gap-1',
                              prospect.priority === 'A' && 'bg-red-400 text-black',
                              prospect.priority === 'B' && 'bg-yellow-300 text-black',
                              prospect.priority === 'C' && 'bg-cyan-300 text-black',
                              !prospect.priority && 'bg-muted text-muted-foreground',
                            )}
                            style={{ borderRadius: 'var(--radius)' }}
                          >
                            {prospect.priority || '-'}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="bg-background z-50 min-w-[80px]">
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); handleSetPriority(prospect, 'A'); }}
                            className="font-bold text-xs"
                          >
                            <span className="inline-block w-5 h-5 rounded bg-red-400 border border-foreground mr-2 text-center text-black font-bold leading-5 text-xs">A</span>
                            A
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); handleSetPriority(prospect, 'B'); }}
                            className="font-bold text-xs"
                          >
                            <span className="inline-block w-5 h-5 rounded bg-yellow-300 border border-foreground mr-2 text-center text-black font-bold leading-5 text-xs">B</span>
                            B
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); handleSetPriority(prospect, 'C'); }}
                            className="font-bold text-xs"
                          >
                            <span className="inline-block w-5 h-5 rounded bg-cyan-300 border border-foreground mr-2 text-center text-black font-bold leading-5 text-xs">C</span>
                            C
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); handleSetPriority(prospect, null); }}
                            className="text-muted-foreground text-xs"
                          >
                            <span className="inline-block w-5 h-5 rounded bg-muted border border-foreground mr-2 text-center font-bold leading-5 text-xs">-</span>
                            None
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                  {isVisible('type') && (
                    <TableCell className={cellPadding}>
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
                  )}
                  {isVisible('requirement') && (
                    <TableCell className={cellPadding}>
                      <RequirementCell prospect={prospect} />
                    </TableCell>
                  )}
                  {isVisible('last_contacted') && (
                    <TableCell className={cellPadding}>
                      <LastContactedCell
                        date={prospect.last_contacted_at}
                        prospectId={prospect.id}
                        prospectName={prospect.name}
                      />
                    </TableCell>
                  )}
                  {isVisible('follow_up') && (
                    <TableCell className={cellPadding}>
                      <FollowUpDueCell date={prospect.follow_up_date} />
                    </TableCell>
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
