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
import { Building2, Calendar, FileText, User } from 'lucide-react';

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
    if (tenant.source === 'transaction' && tenant.transactionId) {
      navigate(`/transactions/${tenant.transactionId}`);
    } else if (tenant.propertyId) {
      navigate(`/properties/${tenant.propertyId}`);
    }
  };

  return (
    <div className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]" style={{ borderRadius: 'var(--radius)' }}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-black uppercase text-xs tracking-wider">Tenant</TableHead>
            <TableHead className="font-black uppercase text-xs tracking-wider">Property</TableHead>
            <TableHead className="font-black uppercase text-xs tracking-wider">Unit</TableHead>
            <TableHead className="font-black uppercase text-xs tracking-wider text-right">Size (SF)</TableHead>
            <TableHead className="font-black uppercase text-xs tracking-wider">Lease Expiry</TableHead>
            <TableHead className="font-black uppercase text-xs tracking-wider hidden md:table-cell">Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTenants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                      Transaction
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <User className="h-3 w-3" />
                      Manual
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
