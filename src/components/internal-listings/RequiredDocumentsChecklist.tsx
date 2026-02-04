import { useMemo } from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InternalListingDocument } from '@/hooks/useInternalListingDocuments';

const REQUIRED_DOCUMENTS = [
  { name: 'Listing Agreement', color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600', lightBg: 'bg-blue-50', borderColor: 'border-blue-300' },
  { name: 'Title', color: 'bg-amber-500', hoverColor: 'hover:bg-amber-600', lightBg: 'bg-amber-50', borderColor: 'border-amber-300' },
  { name: 'Corporate Search', color: 'bg-green-500', hoverColor: 'hover:bg-green-600', lightBg: 'bg-green-50', borderColor: 'border-green-300' },
  { name: 'Building Plans', color: 'bg-purple-500', hoverColor: 'hover:bg-purple-600', lightBg: 'bg-purple-50', borderColor: 'border-purple-300' },
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
      const baseName = requiredDoc.name.toLowerCase();
      const isUploaded = docNames.some(name => {
        // Exact match or versioned match (e.g., "title" or "title_v2")
        return name === baseName || name.match(new RegExp(`^${baseName}_v\\d+$`));
      });
      return { ...requiredDoc, isUploaded };
    });
  }, [documents]);

  const completedCount = uploadedStatus.filter(d => d.isUploaded).length;
  const totalCount = REQUIRED_DOCUMENTS.length;
  const allComplete = completedCount === totalCount;

  return (
    <div className="border-2 border-foreground rounded-lg p-4 bg-card shadow-[3px_3px_0_hsl(var(--foreground))]">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-sm uppercase tracking-wide">Required Documents</h4>
        <span className={cn(
          "text-xs font-bold px-2.5 py-1 rounded-full border-2",
          allComplete 
            ? "bg-green-500 text-white border-green-600" 
            : "bg-amber-400 text-amber-900 border-amber-500"
        )}>
          {completedCount}/{totalCount}
        </span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {uploadedStatus.map(({ name, color, hoverColor, lightBg, borderColor, isUploaded }) => (
          <button
            key={name}
            type="button"
            onClick={() => !isUploaded && onSelectDocument?.(name)}
            disabled={isUploaded}
            className={cn(
              "flex items-center gap-2 p-2.5 rounded-lg border-2 text-left transition-all",
              isUploaded 
                ? `${lightBg} ${borderColor} cursor-default` 
                : `bg-muted/30 border-muted-foreground/20 ${hoverColor} hover:text-white hover:border-transparent cursor-pointer hover:shadow-md`
            )}
          >
            <div className={cn(
              "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors",
              isUploaded 
                ? `${color}` 
                : "bg-muted-foreground/20"
            )}>
              {isUploaded ? (
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              ) : (
                <Circle className="h-2 w-2 text-muted-foreground/40" />
              )}
            </div>
            <span className={cn(
              "text-xs font-medium truncate",
              isUploaded 
                ? "text-foreground" 
                : "text-muted-foreground"
            )}>
              {name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
