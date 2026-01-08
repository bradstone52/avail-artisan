import { useState, useEffect } from 'react';
import { Issue, IssueSettings, Listing } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePdfGeneration } from '@/hooks/usePdfGeneration';
import { supabase } from '@/integrations/supabase/client';
import { 
  Download, 
  Link2, 
  Mail, 
  Check, 
  Copy, 
  FileText,
  ExternalLink,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ShareStepProps {
  issue: Issue | null;
  settings: IssueSettings;
  listingsCount: number;
  listings?: Listing[];
  selectedIds?: string[];
  executiveNotes?: Record<string, string>;
  changeStatus?: Record<string, 'new' | 'changed' | 'unchanged'>;
}

export function ShareStep({ 
  issue, 
  settings, 
  listingsCount,
  listings = [],
  selectedIds = [],
  executiveNotes = {},
  changeStatus = {}
}: ShareStepProps) {
  const [isPublic, setIsPublic] = useState(issue?.pdf_share_enabled ?? false);
  const [copied, setCopied] = useState(false);
  const [currentIssue, setCurrentIssue] = useState<Issue | null>(issue);
  const { generatePdf, updateShareEnabled, isGenerating } = usePdfGeneration();

  // Refresh issue data when it changes
  useEffect(() => {
    if (issue) {
      setCurrentIssue(issue);
      setIsPublic(issue.pdf_share_enabled ?? false);
    }
  }, [issue]);

  const shareUrl = currentIssue?.pdf_share_token 
    ? `${window.location.origin}/share/${currentIssue.pdf_share_token}`
    : '';

  const emailDraft = `Subject: ${settings.title || `Large-Format Distribution Availability — ${format(new Date(), 'MMMM yyyy')}`}

Hi,

I wanted to share our latest distribution availability snapshot for the ${settings.market} market.

This month's report includes ${listingsCount} properties, highlighting the key logistics-capable spaces currently available.

${shareUrl ? `[View Report]: ${shareUrl}` : '[PDF attached]'}

Key highlights:
• ${listingsCount} total spaces tracked
• Size threshold: ${settings.sizeThreshold.toLocaleString()} SF+
• Full property specifications and availability dates included

Let me know if any of these properties are of interest or if you'd like to discuss off-market options.

Best regards,
${settings.primaryContactName || 'Your Team'}
${settings.primaryContactEmail || ''}
${settings.primaryContactPhone || ''}

---
${settings.brokerageName || 'Your Brokerage'}
Information believed reliable but not guaranteed.`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailDraft);
    toast.success('Email draft copied to clipboard');
  };

  const handleGeneratePdf = async () => {
    if (!currentIssue) return;

    // Prepare issue_listings data
    const issueListingsData = selectedIds.map((listingId, index) => ({
      issue_id: currentIssue.id,
      listing_id: listingId,
      change_status: changeStatus[listingId] || null,
      executive_note: executiveNotes[listingId] || null,
      sort_order: index,
    }));

    const result = await generatePdf(currentIssue.id, issueListingsData);
    
    if (result) {
      // Refresh issue data
      const { data: updatedIssue } = await supabase
        .from('issues')
        .select('*')
        .eq('id', currentIssue.id)
        .single();
      
      if (updatedIssue) {
        setCurrentIssue(updatedIssue as Issue);
      }
    }
  };

  const handleViewPdf = () => {
    if (currentIssue?.pdf_url) {
      window.open(currentIssue.pdf_url, '_blank');
    }
  };

  const handleDownload = () => {
    if (currentIssue?.pdf_url) {
      const link = document.createElement('a');
      link.href = currentIssue.pdf_url;
      link.target = '_blank';
      link.download = currentIssue.pdf_filename || 'distribution_snapshot.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleToggleShare = async (enabled: boolean) => {
    if (!currentIssue) return;
    
    const success = await updateShareEnabled(currentIssue.id, enabled);
    if (success) {
      setIsPublic(enabled);
      setCurrentIssue(prev => prev ? { ...prev, pdf_share_enabled: enabled, is_public: enabled } : null);
    }
  };

  const hasPdf = !!currentIssue?.pdf_url;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-display font-semibold mb-1">Share Your Issue</h2>
        <p className="text-muted-foreground text-sm">
          Generate the PDF and share it with your network
        </p>
      </div>

      {/* Success State */}
      {currentIssue && (
        <div className="p-6 bg-success/5 rounded-xl border border-success/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold">Issue Created Successfully!</h3>
              <p className="text-sm text-muted-foreground">
                {hasPdf ? 'Your PDF is ready' : 'Generate the PDF to share'}
              </p>
            </div>
          </div>

          {/* Issue details */}
          <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-card rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Title</p>
              <p className="font-medium text-sm">{currentIssue.title}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Properties</p>
              <p className="font-medium text-sm">{currentIssue.total_listings}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Market</p>
              <p className="font-medium text-sm">{currentIssue.market}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="font-medium text-sm">
                {format(new Date(currentIssue.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Generate PDF Section */}
      <div className="border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold">PDF Document</h3>
        </div>

        {!hasPdf ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a professional PDF ready for distribution
            </p>
            <Button 
              onClick={handleGeneratePdf} 
              disabled={isGenerating || !currentIssue}
              className="w-full sm:w-auto"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate PDF
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{currentIssue?.pdf_filename}</span>
              <span className="text-xs text-muted-foreground">
                ({currentIssue?.pdf_filesize ? formatFileSize(currentIssue.pdf_filesize) : '—'})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleViewPdf} variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                View PDF
              </Button>
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button 
                onClick={handleGeneratePdf} 
                variant="ghost"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Regenerate
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Share Link Section */}
      <div className="border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link2 className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold">Share Link</h3>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="public-toggle" className="text-sm">Enable</Label>
            <Switch
              id="public-toggle"
              checked={isPublic}
              onCheckedChange={handleToggleShare}
              disabled={!hasPdf}
            />
          </div>
        </div>

        {!hasPdf ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            Generate the PDF first to enable sharing
          </div>
        ) : isPublic ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input 
                value={shareUrl} 
                readOnly 
                className="bg-muted/50"
              />
              <Button variant="outline" onClick={handleCopyLink}>
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can view and download the PDF
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Enable sharing to get a public link for this issue
          </p>
        )}
      </div>

      {/* Email Draft Section */}
      <div className="border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold">Email Draft</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Copy this draft to send via your email client
        </p>
        <Textarea
          value={emailDraft}
          readOnly
          className="min-h-[200px] bg-muted/50 font-mono text-xs"
        />
        <Button 
          variant="outline" 
          onClick={handleCopyEmail}
          className="mt-3"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Email Draft
        </Button>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
