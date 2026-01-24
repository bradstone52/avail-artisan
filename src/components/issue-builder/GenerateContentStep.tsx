import { useState } from 'react';
import { Listing } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, Edit3, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatSubmarket } from '@/lib/formatters';

interface ExecutiveNote {
  listingId: string;
  note: string;
  isGenerated: boolean;
}

interface GenerateContentStepProps {
  listings: Listing[];
  selectedIds: string[];
  executiveNotes: Record<string, string>;
  onNotesChange: (notes: Record<string, string>) => void;
}

export function GenerateContentStep({ 
  listings, 
  selectedIds, 
  executiveNotes,
  onNotesChange 
}: GenerateContentStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const selectedListings = listings.filter(l => selectedIds.includes(l.id));

  // Generate executive note from listing data (strict, no invention)
  const generateNote = (listing: Listing): string => {
    const parts: string[] = [];
    
    // Size and type
    parts.push(`${listing.size_sf.toLocaleString()} SF distribution space in ${listing.submarket}`);
    
    // Key specs
    const specs: string[] = [];
    if (listing.clear_height_ft) specs.push(`${listing.clear_height_ft}' clear`);
    if (listing.dock_doors > 0) specs.push(`${listing.dock_doors} dock doors`);
    if (listing.yard === 'Yes') specs.push('yard available');
    if (listing.cross_dock === 'Yes') specs.push('cross-dock capable');
    
    if (specs.length > 0) {
      parts.push(`Features ${specs.join(', ')}.`);
    }
    
    // Availability
    if (listing.availability_date) {
      parts.push(`Available ${listing.availability_date}.`);
    }
    
    // Public notes
    if (listing.notes_public) {
      parts.push(listing.notes_public);
    }
    
    // If we don't have enough info
    if (parts.length < 2) {
      return 'Details available on request.';
    }
    
    return parts.join(' ');
  };

  const handleGenerateAll = async () => {
    setIsGenerating(true);
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newNotes: Record<string, string> = {};
    selectedListings.forEach(listing => {
      if (!executiveNotes[listing.id]) {
        newNotes[listing.id] = generateNote(listing);
      } else {
        newNotes[listing.id] = executiveNotes[listing.id];
      }
    });
    
    onNotesChange(newNotes);
    setIsGenerating(false);
  };

  const handleRegenerateNote = (listing: Listing) => {
    onNotesChange({
      ...executiveNotes,
      [listing.id]: generateNote(listing),
    });
  };

  const handleNoteChange = (listingId: string, note: string) => {
    onNotesChange({
      ...executiveNotes,
      [listingId]: note,
    });
  };

  const notesCount = Object.keys(executiveNotes).length;
  const allGenerated = notesCount === selectedListings.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-display font-semibold mb-1">Generate Content</h2>
        <p className="text-muted-foreground text-sm">
          Create executive-friendly property summaries for each listing
        </p>
      </div>

      {/* Status and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          {allGenerated ? (
            <Badge className="bg-success/10 text-success border-0">
              <Check className="w-3 h-3 mr-1" />
              {notesCount} notes ready
            </Badge>
          ) : (
            <Badge variant="secondary">
              {notesCount} of {selectedListings.length} notes generated
            </Badge>
          )}
        </div>
        <Button 
          onClick={handleGenerateAll}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {allGenerated ? 'Regenerate All' : 'Generate Notes'}
            </>
          )}
        </Button>
      </div>

      {/* Notice about AI rules */}
      <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
        <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-foreground">Strict accuracy rules</p>
          <p className="text-muted-foreground mt-1">
            Notes are generated only from provided data. If information is missing, 
            notes will say "Details available on request" rather than guess.
          </p>
        </div>
      </div>

      {/* Listings with notes */}
      <div className="space-y-4">
        {selectedListings.map(listing => (
          <div 
            key={listing.id}
            className="border border-border rounded-lg p-4"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h4 className="font-medium">
                  {listing.property_name || listing.address}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {formatSubmarket(listing.submarket)} • {listing.size_sf.toLocaleString()} SF
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRegenerateNote(listing)}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingId(editingId === listing.id ? null : listing.id)}
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {editingId === listing.id ? (
              <Textarea
                value={executiveNotes[listing.id] || ''}
                onChange={(e) => handleNoteChange(listing.id, e.target.value)}
                placeholder="Enter executive note..."
                className="min-h-[80px]"
              />
            ) : (
              <p className={cn(
                "text-sm",
                executiveNotes[listing.id] ? "text-foreground" : "text-muted-foreground italic"
              )}>
                {executiveNotes[listing.id] || 'No note generated yet. Click "Generate Notes" above.'}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
