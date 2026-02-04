import { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Upload, Trash2, Download, File, FileImage, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { useInternalListingDocuments, InternalListingDocument } from '@/hooks/useInternalListingDocuments';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DocumentNameCombobox } from './DocumentNameCombobox';

interface InternalListingDocumentsSectionProps {
  listingId: string;
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
};

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export function InternalListingDocumentsSection({ listingId }: InternalListingDocumentsSectionProps) {
  const { documents, isLoading, isUploading, uploadDocument, deleteDocument, getDownloadUrl } = useInternalListingDocuments(listingId);
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<InternalListingDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      // Only auto-fill name if field is empty (preserve user's custom name)
      if (!fileName.trim()) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setFileName(nameWithoutExt);
      }
    }
  }, [fileName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    noClick: true,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Only auto-fill name if field is empty (preserve user's custom name)
      if (!fileName.trim()) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setFileName(nameWithoutExt);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !fileName) return;
    await uploadDocument(selectedFile, fileName);
    setSelectedFile(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (doc: InternalListingDocument) => {
    const url = await getDownloadUrl(doc);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleDelete = async () => {
    if (deleteDoc) {
      await deleteDocument(deleteDoc);
      setDeleteDoc(null);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return File;
    if (fileType.includes('image')) return FileImage;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet;
    if (fileType.includes('pdf')) return FileText;
    return File;
  };

  // Extract original filename from file_path
  // Format: {listing_id}/{timestamp}-{sanitized_name}.{extension}
  const getOriginalFilename = (filePath: string) => {
    const parts = filePath.split('/');
    if (parts.length < 2) return filePath;
    const filenamePart = parts[parts.length - 1];
    // Remove timestamp prefix (e.g., "1707012345678-")
    const match = filenamePart.match(/^\d+-(.+)$/);
    return match ? match[1] : filenamePart;
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload form with drag-drop */}
          <div
            {...getRootProps()}
            className={`p-4 border-2 border-dashed rounded-lg transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 space-y-2 w-full">
                <Label>Document Name</Label>
                <DocumentNameCombobox
                  value={fileName}
                  onChange={setFileName}
                  placeholder="e.g., Lease Agreement, Survey..."
                />
              </div>
              <div className="space-y-2 w-full sm:w-auto">
                <Label>File</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  className="w-full sm:w-64"
                />
              </div>
              <Button
                onClick={handleUpload}
                disabled={isUploading || !selectedFile || !fileName}
                className="w-full sm:w-auto"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
            {isDragActive && (
              <p className="text-center text-sm text-primary mt-3">Drop the file here...</p>
            )}
            {!isDragActive && (
              <p className="text-center text-xs text-muted-foreground mt-3">
                Drag & drop a file here, or use the file picker above. Max 15MB.
              </p>
            )}
          </div>

          {/* Document list */}
          {documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => {
                const IconComponent = getFileIcon(doc.file_type);
                const originalFilename = getOriginalFilename(doc.file_path);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <IconComponent className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {originalFilename}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                          {doc.file_size && ` • ${formatFileSize(doc.file_size)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteDoc(doc)}
                        className="text-destructive hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                No documents uploaded yet. Use the form above to add documents.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteDoc}
        onOpenChange={(open) => !open && setDeleteDoc(null)}
        title="Delete Document"
        description={`Are you sure you want to delete "${deleteDoc?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </>
  );
}
