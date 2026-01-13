import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Issue } from '@/lib/types';
import { toast } from 'sonner';

interface IssueListingData {
  issue_id: string;
  listing_id: string;
  change_status: string | null;
  executive_note: string | null;
  sort_order: number;
}

interface PdfGenerationOptions {
  sizeThresholdMax?: number;
}

interface PdfGenerationResult {
  success: boolean;
  pdf_url: string;
  pdf_filename: string;
  pdf_filesize: number;
  pdf_share_token: string;
}

export function usePdfGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePdf = async (
    issueId: string,
    issueListings?: IssueListingData[],
    options?: PdfGenerationOptions
  ): Promise<PdfGenerationResult | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      // Default maxSF to 500000 if not provided
      const sizeThresholdMax = options?.sizeThresholdMax ?? 500000;

      const response = await supabase.functions.invoke('generate-pdf', {
        body: {
          issue_id: issueId,
          issue_listings: issueListings,
          size_threshold_max: sizeThresholdMax,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate PDF');
      }

      const result = response.data as PdfGenerationResult;
      
      if (!result.success) {
        throw new Error(result.pdf_url || 'PDF generation failed');
      }

      toast.success(`PDF generated (${formatFileSize(result.pdf_filesize)})`);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const updateShareEnabled = async (issueId: string, enabled: boolean): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('issues')
        .update({ 
          pdf_share_enabled: enabled,
          is_public: enabled 
        })
        .eq('id', issueId);

      if (updateError) throw updateError;

      toast.success(enabled ? 'Share link enabled' : 'Share link disabled');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update share settings';
      toast.error(message);
      return false;
    }
  };

  return {
    generatePdf,
    updateShareEnabled,
    isGenerating,
    error,
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
