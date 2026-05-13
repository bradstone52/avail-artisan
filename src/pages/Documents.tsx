import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { FileText, FilePlus, Download, Trash2 } from 'lucide-react';
import { useOfferDocuments, useDeleteOfferDocument } from '@/hooks/useOfferDocuments';
import { supabase } from '@/integrations/supabase/client';
import type { OfferDocument } from '@/types/database';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function docTypeLabel(type: string) {
  if (type === 'offer_to_lease') return 'Offer to Lease';
  return type;
}

function DownloadButton({ doc }: { doc: OfferDocument }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (!doc.docx_path) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('offer-documents')
        .createSignedUrl(doc.docx_path, 3600);
      if (error || !data?.signedUrl) throw error;
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = doc.docx_path.split('/').pop() ?? 'offer.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleDownload}
      disabled={loading || !doc.docx_path}
      title="Download .docx"
    >
      <Download className="h-4 w-4" />
    </Button>
  );
}

export default function Documents() {
  const navigate = useNavigate();
  const { data: documents = [], isLoading } = useOfferDocuments();
  const deleteDoc = useDeleteOfferDocument();

  const [deleteTarget, setDeleteTarget] = useState<OfferDocument | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteDoc.mutateAsync({ id: deleteTarget.id, docxPath: deleteTarget.docx_path });
    setDeleteTarget(null);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Documents</h1>
          </div>
          <Button onClick={() => navigate('/documents/offer-to-lease/new')}>
            <FilePlus className="h-4 w-4 mr-2" />
            New Offer to Lease
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="border rounded-lg p-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No documents yet</p>
            <p className="text-sm mt-1">Generate your first Offer to Lease to get started.</p>
            <Button className="mt-4" onClick={() => navigate('/documents/offer-to-lease/new')}>
              <FilePlus className="h-4 w-4 mr-2" />
              New Offer to Lease
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Badge variant="secondary">{docTypeLabel(doc.document_type)}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {doc.tenant_name ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {doc.premises_address ? (
                        <span>
                          {doc.premises_address}
                          {doc.premises_city ? `, ${doc.premises_city}` : ''}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(doc.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <DownloadButton doc={doc} />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the document
              {deleteTarget?.tenant_name ? ` for ${deleteTarget.tenant_name}` : ''} and remove the file from storage.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
