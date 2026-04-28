import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { TenantWithProperty } from '@/hooks/useAllTenants';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, Calendar, FileText, MoreHorizontal, User, UserPlus } from 'lucide-react';

interface AllTenantsTableProps {
  tenants: TenantWithProperty[];
  searchQuery: string;
}

export function AllTenantsTable({ tenants, searchQuery }: AllTenantsTableProps) {
  const navigate = useNavigate();

  const filteredTenants = tenants.filter((tenant) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      tenant.tenantName.toLowerCase().includes(query) ||
      tenant.propertyAddress?.toLowerCase().includes(query) ||
      tenant.propertyName?.toLowerCase().includes(query) ||
      tenant.propertyCity?.toLowerCase().includes(query)
    );
  });

  const formatNumber = (num: number | null) => {
    if (num === null) return '-';
    return num.toLocaleString();
  };

  const handleRowClick = (tenant: TenantWithProperty) => {
    if (tenant.source === 'transaction' && tenant.leaseCompId) {
      navigate(`/lease-comps/${tenant.leaseCompId}`);
    } else if (tenant.propertyId) {
      navigate(`/properties/${tenant.propertyId}`);
    }
  };

  const handleCreateProspect = (tenant: TenantWithProperty) => {
    const address = tenant.propertyAddress || tenant.propertyName || '';
    const expiry = tenant.leaseExpiry
      ? format(new Date(tenant.leaseExpiry), 'MMM d, yyyy')
      : null;
    const noteparts = [
      'Created from tracked tenant.',
      address && tenant.sizeSf
        ? `Lease at ${address}, ${tenant.sizeSf.toLocaleString()} SF${expiry ? `, expires ${expiry}` : ''}.`
        : address
        ? `Lease at ${address}${expiry ? `, expires ${expiry}` : ''}.`
        : expiry
        ? `Expires ${expiry}.`
        : null,
    ].filter(Boolean);

    localStorage.setItem('prospect-prefill', JSON.stringify({
      name: tenant.tenantName,
      max_size: tenant.sizeSf ?? undefined,
      prospect_type: 'Tenant',
      notes: noteparts.join(' '),
    }));
    navigate('/prospects');
  };

  return (
    <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold text-muted-foreground uppercase text-xs tracking-wide">Tenant</TableHead>
            <TableHead className="font-semibold text-muted-foreground uppercase text-xs tracking-wide">Property</TableHead>
            <TableHead className="font-semibold text-muted-foreground uppercase text-xs tracking-wide">Unit</TableHead>
            <TableHead className="font-semibold text-muted-foreground uppercase text-xs tracking-wide text-right">Size (SF)</TableHead>
            <TableHead className="font-semibold text-muted-foreground uppercase text-xs tracking-wide">Lease Expiry</TableHead>
            <TableHead className="font-semibold text-muted-foreground uppercase text-xs tracking-wide hidden md:table-cell">Source</TableHead>
            <TableHead className="font-semibold text-muted-foreground uppercase text-xs tracking-wide w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTenants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No tenants match your search' : 'No tenants tracked yet'}
              </TableCell>
            </TableRow>
          ) : (
            filteredTenants.map((tenant) => (
              <TableRow
                key={tenant.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleRowClick(tenant)}
              >
                <TableCell className="font-bold">{tenant.tenantName}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate text-sm">
                        {tenant.propertyName || tenant.propertyAddress}
                      </div>
                      {tenant.propertyCity && (
                        <div className="text-xs text-muted-foreground">{tenant.propertyCity}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {tenant.unitNumber ? (
                    <Badge variant="outline" className="font-mono">
                      {tenant.unitNumber}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatNumber(tenant.sizeSf)}
                </TableCell>
                <TableCell>
                  {tenant.leaseExpiry ? (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{format(new Date(tenant.leaseExpiry), 'MMM d, yyyy')}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {tenant.source === 'transaction' ? (
                    <Badge variant="secondary" className="gap-1">
                      <FileText className="h-3 w-3" />
                      Lease Comp
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <User className="h-3 w-3" />
                      Manual
                    </Badge>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleCreateProspect(tenant)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create Prospect
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
    </Table>
  );
}
