import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useLeaseComps } from '@/hooks/useLeaseComps';
import { formatSubmarket } from '@/lib/formatters';
import { ArrowLeft, Pencil, Trash2, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { LeaseComp } from '@/hooks/useLeaseComps';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-medium text-sm text-right">{value ?? '—'}</span>
    </div>
  );
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return format(parseISO(d), 'MMMM d, yyyy');
}

function formatRate(v: number | null): string {
  if (v == null) return '—';
  return `$${v.toFixed(2)}/SF`;
}

export default function LeaseCompDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getLeaseComp, deleteLeaseComp } = useLeaseComps();

  const [comp, setComp] = useState<LeaseComp | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getLeaseComp(id).then((data) => {
      setComp(data);
      setIsLoading(false);
    });
  }, [id, getLeaseComp]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    const ok = await deleteLeaseComp(id);
    setIsDeleting(false);
    if (ok) navigate('/lease-comps');
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!comp) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-muted-foreground">Lease comp not found.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/lease-comps')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Lease Comps
        </button>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl leading-snug">{comp.address}</CardTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                {comp.submarket && (
                  <Badge variant="outline">{formatSubmarket(comp.submarket)}</Badge>
                )}
                {comp.is_tracked && (
                  <Badge variant="secondary">Tracked</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/lease-comps/${id}/edit`)}
              >
                <Pencil className="h-4 w-4 mr-1.5" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Core lease terms */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Lease Terms
              </p>
              <Separator className="mb-2" />
              <Field label="Net Rate" value={formatRate(comp.net_rate_psf)} />
              <Field label="Op Costs" value={formatRate(comp.op_costs_psf)} />
              <Field
                label="Gross Rate"
                value={
                  comp.net_rate_psf != null && comp.op_costs_psf != null
                    ? formatRate(comp.net_rate_psf + comp.op_costs_psf)
                    : '—'
                }
              />
              <Field
                label="Size"
                value={comp.size_sf != null ? comp.size_sf.toLocaleString() + ' SF' : null}
              />
              <Field
                label="Term"
                value={comp.term_months != null ? `${comp.term_months} months` : null}
              />
              <Field label="Commencement" value={formatDate(comp.commencement_date)} />
              <Field
                label="Fixturing"
                value={comp.fixturing_months != null ? `${comp.fixturing_months} months` : null}
              />
            </div>

            {/* Parties */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Parties
              </p>
              <Separator className="mb-2" />
              <Field label="Tenant" value={comp.tenant_name} />
              <Field label="Landlord" value={comp.landlord_name} />
            </div>

            {/* Metadata */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Details
              </p>
              <Separator className="mb-2" />
              <Field label="Source" value={comp.source} />
              <Field label="Notes" value={comp.notes} />
              <Field label="Added" value={formatDate(comp.created_at)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={(open) => !open && setShowDelete(false)}
        title="Delete Lease Comp"
        description="Are you sure you want to delete this lease comp? This action cannot be undone."
        confirmLabel={isDeleting ? 'Deleting…' : 'Delete'}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </AppLayout>
  );
}
