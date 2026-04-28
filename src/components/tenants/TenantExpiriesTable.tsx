import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TenantExpiry, getExpiryStatus, ExpiryStatus } from '@/hooks/useTenantExpiries';
import { cn } from '@/lib/utils';
import { MoreHorizontal, UserPlus } from 'lucide-react';

interface TenantExpiriesTableProps {
  expiries: TenantExpiry[];
  searchQuery?: string;
}

const statusStyles: Record<ExpiryStatus, string> = {
  expired: 'bg-red-100 text-red-800 border-red-300',
  urgent: 'bg-red-100 text-red-800 border-red-300',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  upcoming: 'bg-green-100 text-green-800 border-green-300',
  future: '',
};

const statusLabels: Record<ExpiryStatus, string> = {
  expired: 'Expired',
  urgent: '< 6 Months',
  warning: '6-9 Months',
  upcoming: '9-12 Months',
  future: '',
};

export function TenantExpiriesTable({ expiries, searchQuery = '' }: TenantExpiriesTableProps) {
  const navigate = useNavigate();

  const filteredExpiries = expiries.filter((expiry) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      expiry.tenantName.toLowerCase().includes(query) ||
      expiry.propertyAddress?.toLowerCase().includes(query) ||
      expiry.propertyName?.toLowerCase().includes(query) ||
      expiry.propertyCity?.toLowerCase().includes(query)
    );
  });

  const formatNumber = (num: number | null) => {
    if (num === null) return '—';
    return num.toLocaleString();
  };

  const handleCreateProspect = (expiry: TenantExpiry) => {
    const address = expiry.propertyAddress || expiry.propertyName || '';
    const expiryFormatted = format(new Date(expiry.expiryDate), 'MMM d, yyyy');
    const noteparts = [
      'Created from tracked tenant.',
      address && expiry.sizeSf
        ? `Lease at ${address}, ${expiry.sizeSf.toLocaleString()} SF, expires ${expiryFormatted}.`
        : address
        ? `Lease at ${address}, expires ${expiryFormatted}.`
        : `Expires ${expiryFormatted}.`,
    ];

    localStorage.setItem('prospect-prefill', JSON.stringify({
      name: expiry.tenantName,
      max_size: expiry.sizeSf ?? undefined,
      prospect_type: 'Tenant',
      notes: noteparts.join(' '),
    }));
    navigate('/prospects');
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tenant</TableHead>
          <TableHead>Property</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead className="text-right">Size (SF)</TableHead>
          <TableHead>Commencement</TableHead>
          <TableHead>Expiry</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Source</TableHead>
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredExpiries.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
              {searchQuery ? 'No tenants match your search' : 'No tenant expiries found'}
            </TableCell>
          </TableRow>
        ) : (
          filteredExpiries.map((expiry) => {
            const status = getExpiryStatus(expiry.expiryDate);
            const showStatusBadge = status !== 'future';

            return (
              <TableRow key={expiry.id}>
                <TableCell className="font-semibold">{expiry.tenantName}</TableCell>
                <TableCell>
                  {expiry.propertyId ? (
                    <Link
                      to={`/properties/${expiry.propertyId}`}
                      className="text-primary hover:underline"
                    >
                      {expiry.propertyAddress || expiry.propertyName || 'View Property'}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">
                      {expiry.propertyAddress || '—'}
                    </span>
                  )}
                  {expiry.propertyCity && (
                    <span className="text-muted-foreground text-sm block">
                      {expiry.propertyCity}
                    </span>
                  )}
                </TableCell>
                <TableCell>{expiry.unitNumber || '—'}</TableCell>
                <TableCell className="text-right">{formatNumber(expiry.sizeSf)}</TableCell>
                <TableCell>
                  {expiry.commencementDate
                    ? format(new Date(expiry.commencementDate), 'MMM d, yyyy')
                    : '—'}
                </TableCell>
                <TableCell>
                  {format(new Date(expiry.expiryDate), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  {showStatusBadge && (
                    <Badge
                      variant="outline"
                      className={cn('font-medium border', statusStyles[status])}
                    >
                      {statusLabels[status]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      'font-medium border',
                      expiry.source === 'manual'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    )}
                  >
                    {expiry.source === 'manual' ? 'Manual' : 'Lease Comp'}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleCreateProspect(expiry)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Prospect
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
