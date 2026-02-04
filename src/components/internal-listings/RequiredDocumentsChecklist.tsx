import { useMemo } from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InternalListingDocument } from '@/hooks/useInternalListingDocuments';

const REQUIRED_DOCUMENTS = [
  'Listing Agreement',
  'Title',
  'Corporate Search',
  'Building Plans',
];

interface RequiredDocumentsChecklistProps {
  documents: InternalListingDocument[];
  onSelectDocument?: (docName: string) => void;
}

export function RequiredDocumentsChecklist({ 
  documents, 
  onSelectDocument 
}: RequiredDocumentsChecklistProps) {
  // Check which required documents have been uploaded
  // Match base name or versioned names (e.g., "Title", "Title_v2", "Title_v3")
  const uploadedStatus = useMemo(() => {
    const docNames = documents.map(d => d.name.toLowerCase());
    
    return REQUIRED_DOCUMENTS.map(requiredDoc => {
      const baseName = requiredDoc.toLowerCase();
      const isUploaded = docNames.some(name => {
        // Exact match or versioned match (e.g., "title" or "title_v2")
        return name === baseName || name.match(new RegExp(`^${baseName}_v\\d+$`));
      });
      return { name: requiredDoc, isUploaded };
    });
  }, [documents]);

  const completedCount = uploadedStatus.filter(d => d.isUploaded).length;
  const totalCount = REQUIRED_DOCUMENTS.length;
  const allComplete = completedCount === totalCount;

  return (
    <div className="border-2 border-foreground rounded-lg p-4 bg-card shadow-[2px_2px_0_hsl(var(--foreground))]">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm uppercase tracking-wide">Required Documents</h4>
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full border",
          allComplete 
            ? "bg-green-100 text-green-800 border-green-300" 
            : "bg-amber-100 text-amber-800 border-amber-300"
        )}>
          {completedCount}/{totalCount}
        </span>
      </div>
      
      <div className="space-y-2">
        {uploadedStatus.map(({ name, isUploaded }) => (
          <button
            key={name}
            type="button"
            onClick={() => !isUploaded && onSelectDocument?.(name)}
            disabled={isUploaded}
            className={cn(
              "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
              isUploaded 
                ? "cursor-default" 
                : "hover:bg-muted/50 cursor-pointer"
            )}
          >
            <div className={cn(
              "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
              isUploaded 
                ? "bg-green-500 border-green-500" 
                : "border-muted-foreground/40"
            )}>
              {isUploaded ? (
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              ) : (
                <Circle className="h-2 w-2 text-muted-foreground/20" />
              )}
            </div>
            <span className={cn(
              "text-sm",
              isUploaded 
                ? "text-muted-foreground line-through" 
                : "text-foreground"
            )}>
              {name}
            </span>
          </button>
        ))}
      </div>
      
      {!allComplete && (
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
          Click a document name to pre-fill the upload form
        </p>
      )}
    </div>
  );
}
