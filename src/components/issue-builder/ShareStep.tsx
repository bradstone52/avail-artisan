import { useState } from 'react';
import { Issue, IssueSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Link2, 
  Mail, 
  Check, 
  Copy, 
  FileText,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ShareStepProps {
  issue: Issue | null;
  settings: IssueSettings;
  listingsCount: number;
}

export function ShareStep({ issue, settings, listingsCount }: ShareStepProps) {
  const [isPublic, setIsPublic] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = issue 
    ? `${window.location.origin}/issues/${issue.id}`
    : '';

  const emailDraft = `Subject: ${settings.title || `Large-Format Distribution Availability — ${format(new Date(), 'MMMM yyyy')}`}

Hi,

I wanted to share our latest distribution availability snapshot for the ${settings.market} market.

This month's report includes ${listingsCount} properties, highlighting the key logistics-capable spaces currently available.

[View Report]: ${shareUrl}

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

  const handleDownload = () => {
    toast.info('PDF generation coming soon');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-display font-semibold mb-1">Share Your Issue</h2>
        <p className="text-muted-foreground text-sm">
          Download the PDF or share it with your network
        </p>
      </div>

      {/* Success State */}
      {issue && (
        <div className="p-6 bg-success/5 rounded-xl border border-success/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold">Issue Created Successfully!</h3>
              <p className="text-sm text-muted-foreground">
                Your distribution snapshot is ready
              </p>
            </div>
          </div>

          {/* Issue details */}
          <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-card rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Title</p>
              <p className="font-medium text-sm">{issue.title}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Properties</p>
              <p className="font-medium text-sm">{issue.total_listings}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Market</p>
              <p className="font-medium text-sm">{issue.market}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="font-medium text-sm">
                {format(new Date(issue.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Download Section */}
      <div className="border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold">Download PDF</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Get a professional PDF ready for distribution
        </p>
        <Button onClick={handleDownload} className="w-full sm:w-auto">
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Share Link Section */}
      <div className="border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link2 className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold">Share Link</h3>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="public-toggle" className="text-sm">Public</Label>
            <Switch
              id="public-toggle"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </div>

        {isPublic ? (
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
              Anyone with this link can view the issue
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Enable public sharing to get a shareable link
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
