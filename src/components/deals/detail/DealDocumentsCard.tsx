import { useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, Trash2, Download, File, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { DealDocument } from '@/hooks/useDealDocuments';

const DOCUMENT_TYPES = [
  'Purchase Agreement',
  'Amendment',
  'Waiver',
  'Title',
  'Real Property Report',
  'Environmental Report',
  'Building Inspection',
  'Appraisal',
  'Survey',
  'Lease Agreement',
  'Letter of Intent',
  'Deposit Receipt',
  'Closing Statement',
  'Commission Agreement',
  'Other',
] as const;

function generateDocumentName(docType: string, address: string): string {
  const cleanAddress = address.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
  const dateStr = format(new Date(), 'ddMMMyyyy').toUpperCase();
  const cleanType = docType.replace(/\s+/g, '_');
  return `${cleanType}_${cleanAddress}_${dateStr}`;
}

interface DealDocumentsCardProps {
  documents: DealDocument[];
  onUpload: (file: File, name: string) => Promise<void>;
  onDelete: (doc: DealDocument) => Promise<void>;
  isUploading: boolean;
  dealAddress?: string;
}

export function DealDocumentsCard({ 
  documents, 
  onUpload, 
  onDelete,
  isUploading,
  dealAddress = '',
}: DealDocumentsCardProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDocumentTypeChange = (type: string) => {
    setDocumentType(type);
    if (type && dealAddress) {
      setFileName(generateDocumentName(type, dealAddress));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Only auto-populate name from filename if no document type selected
      if (!documentType) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setFileName(nameWithoutExt);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !fileName) return;
    await onUpload(selectedFile, fileName);
    setSelectedFile(null);
    setFileName('');
    setDocumentType('');
    setUploadOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (open: boolean) => {
    setUploadOpen(open);
    if (!open) {
      setSelectedFile(null);
      setFileName('');
      setDocumentType('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (doc: DealDocument) => {
    const { data } = await supabase.storage
      .from('deals')
      .createSignedUrl(doc.file_path, 60);
    
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Upload
          </Button>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div 
                  key={doc.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <File className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                        {doc.file_size && ` • ${formatFileSize(doc.file_size)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete(doc)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              No documents uploaded yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={uploadOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={documentType} onValueChange={handleDocumentTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type..." />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Document Name</Label>
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter document name..."
              />
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              <Input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={isUploading || !selectedFile || !fileName}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
