import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, MoreVertical, Pencil, Trash2, Users, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { usePropertyTenants, PropertyTenant } from '@/hooks/usePropertyTenants';
import { AddTenantDialog } from './AddTenantDialog';

interface TenantsSectionProps {
  propertyId: string;
  propertyName: string;
}

export function TenantsSection({ propertyId, propertyName }: TenantsSectionProps) {
  const { tenants, loading, fetchTenants, createTenant, updateTenant, deleteTenant } = usePropertyTenants(propertyId);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<PropertyTenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<PropertyTenant | null>(null);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleSave = async (data: {
    tenant_name: string;
    unit_number?: string | null;
    size_sf?: number | null;
    notes?: string | null;
  }) => {
    if (editingTenant) {
      const result = await updateTenant(editingTenant.id, data);
      return !!result;
    } else {
      const result = await createTenant({
        property_id: propertyId,
        ...data,
      });
      return !!result;
    }
  };

  const handleDelete = async () => {
    if (!deletingTenant) return;
    await deleteTenant(deletingTenant.id);
    setDeletingTenant(null);
  };

  const totalOccupied = tenants.reduce((sum, t) => sum + (t.size_sf || 0), 0);

  return (
    <div className="space-y-4">
      {/* Stats Card */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tenants.length}</p>
                <p className="text-xs text-muted-foreground">Known Tenants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {totalOccupied > 0 ? totalOccupied.toLocaleString() : '—'}
                </p>
                <p className="text-xs text-muted-foreground">SF Occupied</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenants List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tenants</CardTitle>
            <CardDescription>Known occupants at this property</CardDescription>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading tenants...
            </div>
          ) : tenants.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-2">No tenants tracked yet</p>
              <p className="text-sm text-muted-foreground">
                Add tenants to track occupancy at this property
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tenants.map((tenant, index) => (
                <div key={tenant.id}>
                  {index > 0 && <Separator className="my-3" />}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold truncate">{tenant.tenant_name}</p>
                        {tenant.unit_number && (
                          <Badge variant="secondary" className="text-xs">
                            {tenant.unit_number}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {tenant.size_sf && (
                          <span>{tenant.size_sf.toLocaleString()} SF</span>
                        )}
                        <span>
                          Tracked {format(new Date(tenant.tracked_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {tenant.notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          {tenant.notes}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingTenant(tenant)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingTenant(tenant)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <AddTenantDialog
        open={addDialogOpen || !!editingTenant}
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogOpen(false);
            setEditingTenant(null);
          }
        }}
        onSave={handleSave}
        tenant={editingTenant}
        propertyName={propertyName}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTenant} onOpenChange={(open) => !open && setDeletingTenant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{deletingTenant?.tenant_name}" from this property?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
