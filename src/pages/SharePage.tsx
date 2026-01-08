import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Issue } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIssue() {
      if (!token) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('issues')
        .select('*')
        .eq('pdf_share_token', token)
        .single();

      if (fetchError || !data) {
        setError('Issue not found');
        setLoading(false);
        return;
      }

      const issueData = data as Issue;

      // Check if sharing is enabled
      if (!issueData.pdf_share_enabled) {
        setError('This share link has been disabled');
        setLoading(false);
        return;
      }

      // Check if PDF exists
      if (!issueData.pdf_url) {
        setError('PDF not available');
        setLoading(false);
        return;
      }

      setIssue(issueData);
      setLoading(false);
    }

    fetchIssue();
  }, [token]);

  const handleViewPdf = () => {
    if (issue?.pdf_url) {
      window.open(issue.pdf_url, '_blank');
    }
  };

  const handleDownload = () => {
    if (issue?.pdf_url) {
      const link = document.createElement('a');
      link.href = issue.pdf_url;
      link.target = '_blank';
      link.download = issue.pdf_filename || 'distribution_snapshot.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-4">
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-display font-semibold mb-2">Link Not Available</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
          {/* Header */}
          <div className="p-8 bg-gradient-to-br from-primary/5 to-primary/10 border-b border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Distribution Report
                </p>
                <h1 className="text-xl font-display font-semibold">
                  {issue?.title}
                </h1>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Details */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div>
                <p className="text-xs text-muted-foreground">Market</p>
                <p className="font-medium">{issue?.market}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Properties</p>
                <p className="font-medium">{issue?.total_listings}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Published</p>
                <p className="font-medium">
                  {issue?.published_at 
                    ? format(new Date(issue.published_at), 'MMMM d, yyyy')
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Size Threshold</p>
                <p className="font-medium">{issue?.size_threshold.toLocaleString()} SF+</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-display font-bold">{issue?.total_listings}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-4 bg-badge-new/10 rounded-lg">
                <p className="text-2xl font-display font-bold text-success">{issue?.new_count}</p>
                <p className="text-xs text-muted-foreground">New</p>
              </div>
              <div className="text-center p-4 bg-badge-changed/10 rounded-lg">
                <p className="text-2xl font-display font-bold text-warning">{issue?.changed_count}</p>
                <p className="text-xs text-muted-foreground">Changed</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleViewPdf} className="flex-1">
                <ExternalLink className="w-4 h-4 mr-2" />
                View PDF
              </Button>
              <Button onClick={handleDownload} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-muted/30 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              {issue?.brokerage_name && `${issue.brokerage_name} • `}
              Information believed reliable but not guaranteed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
