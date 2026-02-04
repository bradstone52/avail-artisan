import { useMemo } from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InternalListingDocument } from '@/hooks/useInternalListingDocuments';

const REQUIRED_DOCUMENTS = [
  { name: 'Listing Agreement', color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600', lightBg: 'bg-blue-50', borderColor: 'border-blue-300' },
  { name: 'Title', color: 'bg-amber-500', hoverColor: 'hover:bg-amber-600', lightBg: 'bg-amber-50', borderColor: 'border-amber-300' },
  { name: 'Corporate Search', color: 'bg-green-500', hoverColor: 'hover:bg-green-600', lightBg: 'bg-green-50', borderColor: 'border-green-300' },
  { name: 'Brochure', color: 'bg-indigo-500', hoverColor: 'hover:bg-indigo-600', lightBg: 'bg-indigo-50', borderColor: 'border-indigo-300' },
];

const ENCOURAGED_DOCUMENTS = [
  { name: 'Building Plans', color: 'bg-purple-500', hoverColor: 'hover:bg-purple-600', lightBg: 'bg-purple-50', borderColor: 'border-purple-300' },
  { name: 'Real Property Report', color: 'bg-cyan-500', hoverColor: 'hover:bg-cyan-600', lightBg: 'bg-cyan-50', borderColor: 'border-cyan-300' },
  { name: 'ESA Phase 1', color: 'bg-rose-500', hoverColor: 'hover:bg-rose-600', lightBg: 'bg-rose-50', borderColor: 'border-rose-300' },
  { name: 'ESA Phase 2', color: 'bg-orange-500', hoverColor: 'hover:bg-orange-600', lightBg: 'bg-orange-50', borderColor: 'border-orange-300' },
];

interface RequiredDocumentsChecklistProps {
  documents: InternalListingDocument[];
  onSelectDocument?: (docName: string) => void;
}

// Helper to check upload status for a list of documents
function useDocumentUploadStatus(documents: InternalListingDocument[], docList: typeof REQUIRED_DOCUMENTS) {
  return useMemo(() => {
    const docNames = documents.map(d => d.name.toLowerCase());
    
    return docList.map(doc => {
      const baseName = doc.name.toLowerCase();
      const isUploaded = docNames.some(name => {
        // Exact match or versioned match (e.g., "title" or "title_v2")
        return name === baseName || name.match(new RegExp(`^${baseName}_v\\d+$`));
      });
      return { ...doc, isUploaded };
    });
  }, [documents, docList]);
}

interface DocumentChecklistSectionProps {
  title: string;
  documents: InternalListingDocument[];
  docList: typeof REQUIRED_DOCUMENTS;
  onSelectDocument?: (docName: string) => void;
  showCounter?: boolean;
}

function DocumentChecklistSection({ 
  title, 
  documents, 
  docList, 
  onSelectDocument,
  showCounter = true 
}: DocumentChecklistSectionProps) {
  const uploadedStatus = useDocumentUploadStatus(documents, docList);
  const completedCount = uploadedStatus.filter(d => d.isUploaded).length;
  const totalCount = docList.length;
  const allComplete = completedCount === totalCount;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold text-xs uppercase tracking-wide text-muted-foreground">{title}</h4>
        {showCounter && (
          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full border",
            allComplete 
              ? "bg-green-500 text-white border-green-600" 
              : "bg-amber-400 text-amber-900 border-amber-500"
          )}>
            {completedCount}/{totalCount}
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {uploadedStatus.map(({ name, color, hoverColor, lightBg, borderColor, isUploaded }) => (
          <button
            key={name}
            type="button"
            onClick={() => !isUploaded && onSelectDocument?.(name)}
            disabled={isUploaded}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg border-2 text-left transition-all",
              isUploaded 
                ? `${lightBg} ${borderColor} cursor-default` 
                : `bg-muted/30 border-muted-foreground/20 ${hoverColor} hover:text-white hover:border-transparent cursor-pointer hover:shadow-md`
            )}
          >
            <div className={cn(
              "flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors",
              isUploaded 
                ? `${color}` 
                : "bg-muted-foreground/20"
            )}>
              {isUploaded ? (
                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
              ) : (
                <Circle className="h-1.5 w-1.5 text-muted-foreground/40" />
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

export function RequiredDocumentsChecklist({ 
  documents, 
  onSelectDocument 
}: RequiredDocumentsChecklistProps) {
  return (
    <div className="border-2 border-foreground rounded-lg p-4 bg-card shadow-[3px_3px_0_hsl(var(--foreground))] space-y-4">
      <DocumentChecklistSection
        title="Required Documents"
        documents={documents}
        docList={REQUIRED_DOCUMENTS}
        onSelectDocument={onSelectDocument}
        showCounter={true}
      />
      
      <DocumentChecklistSection
        title="Strongly Encouraged"
        documents={documents}
        docList={ENCOURAGED_DOCUMENTS}
        onSelectDocument={onSelectDocument}
        showCounter={true}
      />
    </div>
  );
}
