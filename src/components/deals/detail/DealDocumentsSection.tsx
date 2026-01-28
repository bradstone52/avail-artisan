import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Upload, Trash2, Download, File } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { DealDocument } from '@/hooks/useDealDocuments';

interface DealDocumentsSectionProps {
  documents: DealDocument[];
  onUpload: (file: File, name: string) => Promise<void>;
  onDelete: (doc: DealDocument) => Promise<void>;
  isUploading: boolean;
}

export function DealDocumentsSection({ 
  documents, 
  onUpload, 
  onDelete,
  isUploading 
}: DealDocumentsSectionProps) {
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Default to file name without extension
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setFileName(nameWithoutExt);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !fileName) return;
    await onUpload(selectedFile, fileName);
    setSelectedFile(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload form */}
        <div className="flex gap-3 items-end p-4 border-2 border-dashed rounded-lg">
          <div className="flex-1 space-y-2">
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
              className="w-64"
            />
          </div>
          <Button 
            onClick={handleUpload} 
            disabled={isUploading || !selectedFile || !fileName}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>

        {/* Document list */}
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
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                      {doc.file_size && ` • ${formatFileSize(doc.file_size)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onDelete(doc)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No documents uploaded yet. Use the form above to add documents.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
