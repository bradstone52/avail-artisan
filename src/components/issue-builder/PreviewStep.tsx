/**
 * PreviewStep Component
 * 
 * Renders a preview of the PDF using the shared print template.
 * This ensures the preview matches exactly what DocRaptor will generate.
 */

import { useMemo } from 'react';
import { Listing, IssueSettings } from '@/lib/types';
import { 
  buildPrintHtml, 
  logTemplateDebug,
  DEFAULT_PRIMARY_CONTACT, 
  DEFAULT_SECONDARY_CONTACT,
  PrintTemplateData,
  PrintTemplateListing 
} from '@/lib/print-template';

interface PreviewStepProps {
  settings: IssueSettings;
  listings: Listing[];
  selectedIds: string[];
  executiveNotes: Record<string, string>;
  changeStatus: Record<string, 'new' | 'changed' | 'unchanged'>;
  includeDetails?: boolean;
  debugMode?: boolean;
}

export function PreviewStep({ 
  settings, 
  listings, 
  selectedIds, 
  executiveNotes,
  changeStatus,
  includeDetails = false,
  debugMode = false,
}: PreviewStepProps) {
  // Convert listings to print template format and generate HTML
  const { html, debugInfo } = useMemo(() => {
    const selectedListings = listings.filter(l => selectedIds.includes(l.id));
    
    // Convert to PrintTemplateListing format
    const printListings: PrintTemplateListing[] = selectedListings.map(l => ({
      id: l.id,
      listing_id: l.listing_id,
      property_name: l.property_name,
      address: l.address,
      city: l.city,
      submarket: l.submarket,
      size_sf: l.size_sf,
      clear_height_ft: l.clear_height_ft,
      dock_doors: l.dock_doors,
      drive_in_doors: l.drive_in_doors,
      availability_date: l.availability_date,
      notes_public: l.notes_public,
      trailer_parking: l.trailer_parking,
    }));

    const newCount = Object.values(changeStatus).filter(s => s === 'new').length;

    const templateData: PrintTemplateData = {
      title: settings.title || "Large-Format Distribution Availability",
      market: settings.market || "Calgary Region",
      sizeThreshold: settings.sizeThreshold || 100000,
      sizeThresholdMax: settings.sizeThresholdMax || 500000,
      listings: printListings,
      primary: {
        name: settings.primaryContactName || DEFAULT_PRIMARY_CONTACT.name,
        email: settings.primaryContactEmail || DEFAULT_PRIMARY_CONTACT.email,
        phone: settings.primaryContactPhone || DEFAULT_PRIMARY_CONTACT.phone,
      },
      secondary: {
        name: settings.secondaryContactName || DEFAULT_SECONDARY_CONTACT.name,
        email: settings.secondaryContactEmail || DEFAULT_SECONDARY_CONTACT.email,
        phone: settings.secondaryContactPhone || DEFAULT_SECONDARY_CONTACT.phone,
      },
      newCount,
      includeDetails,
      executiveNotes,
      debugMode,
    };

    const generatedHtml = buildPrintHtml(templateData);
    
    // Log debug info if in debug mode
    if (debugMode) {
      logTemplateDebug('PreviewStep', generatedHtml);
    }

    return { 
      html: generatedHtml,
      debugInfo: debugMode ? {
        length: generatedHtml.length,
        listingCount: printListings.length,
      } : null
    };
  }, [settings, listings, selectedIds, executiveNotes, changeStatus, includeDetails, debugMode]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-headline mb-1">Preview</h2>
        <p className="text-caption">
          Review your market snapshot before generating the PDF
        </p>
        {debugInfo && (
          <div className="mt-2 p-2 bg-yellow-100 border border-yellow-400 rounded text-xs font-mono">
            Debug: HTML Length={debugInfo.length}, Listings={debugInfo.listingCount}
          </div>
        )}
      </div>

      {/* 
        Render the print template HTML in an iframe to ensure 
        complete style isolation and accurate preview 
      */}
      <div className="border-3 border-foreground bg-white shadow-lg">
        <iframe
          srcDoc={html}
          title="PDF Preview"
          className="w-full min-h-[800px] border-0"
          style={{ 
            display: 'block',
            background: 'white',
          }}
        />
      </div>

      <p className="text-xs text-muted-foreground text-center">
        This preview shows exactly what the generated PDF will look like.
      </p>
    </div>
  );
}
