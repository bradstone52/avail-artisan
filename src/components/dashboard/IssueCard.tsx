import { formatDistanceToNow } from 'date-fns';
import { FileText, Download, Share2, ExternalLink, MoreVertical, Loader2 } from 'lucide-react';
import { Issue } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePdfGeneration } from '@/hooks/usePdfGeneration';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface IssueCardProps {
  issue: Issue;
  onRefresh?: () => void;
}

export function IssueCard({ issue, onRefresh }: IssueCardProps) {
  const { generatePdf, isGenerating } = usePdfGeneration();
  
  const formattedDate = issue.published_at 
    ? formatDistanceToNow(new Date(issue.published_at), { addSuffix: true })
    : formatDistanceToNow(new Date(issue.created_at), { addSuffix: true });

  const handleView = () => {
    if (issue.pdf_url) {
      window.open(issue.pdf_url, '_blank');
    } else {
      toast.info('No PDF generated yet. Generate one first.');
    }
  };

  const handleDownload = () => {
    if (issue.pdf_url) {
      const link = document.createElement('a');
      link.href = issue.pdf_url;
      link.target = '_blank';
      link.download = issue.pdf_filename || 'distribution_snapshot.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast.info('No PDF generated yet. Generate one first.');
    }
  };

  const handleShare = () => {
    if (issue.pdf_share_enabled && issue.pdf_share_token) {
      const shareUrl = `${window.location.origin}/share/${issue.pdf_share_token}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard');
    } else if (!issue.pdf_url) {
      toast.info('Generate a PDF first to enable sharing.');
    } else {
      toast.info('Sharing is disabled for this issue.');
    }
  };

  const handleGenerate = async () => {
    await generatePdf(issue.id);
    onRefresh?.();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow animate-fade-in">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-medium text-sm truncate">{issue.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {issue.market} • {formattedDate}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MoreVertical className="w-4 h-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleView} disabled={!issue.pdf_url}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload} disabled={!issue.pdf_url}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare} disabled={!issue.pdf_share_enabled}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Copy Share Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleGenerate} disabled={isGenerating}>
                  <FileText className="w-4 h-4 mr-2" />
                  {issue.pdf_url ? 'Regenerate PDF' : 'Generate PDF'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-3">
            <Badge variant="secondary" className="text-xs">
              {issue.total_listings} properties
            </Badge>
            {issue.new_count > 0 && (
              <Badge className="text-xs bg-badge-new text-badge-new-foreground">
                {issue.new_count} new
              </Badge>
            )}
            {issue.changed_count > 0 && (
              <Badge className="text-xs bg-badge-changed text-badge-changed-foreground">
                {issue.changed_count} changed
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
