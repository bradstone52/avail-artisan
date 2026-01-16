import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';

export default function TrackingRedirect() {
  const { trackingToken } = useParams<{ trackingToken: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function trackAndRedirect() {
      if (!trackingToken) {
        setError('Invalid tracking link');
        return;
      }

      try {
        // Look up the send by tracking token
        const { data: send, error: sendError } = await supabase
          .from('distribution_sends')
          .select('id, report_id')
          .eq('tracking_token', trackingToken)
          .single();

        if (sendError || !send) {
          setError('Link not found');
          return;
        }

        // Log the view event (anonymous insert allowed by RLS)
        await supabase.from('distribution_events').insert({
          send_id: send.id,
          event_type: 'view',
          user_agent: navigator.userAgent,
          // IP address will be null since we can't get it client-side
        });

        // Get the issue's share token to redirect to the share page
        const { data: issue, error: issueError } = await supabase
          .from('issues')
          .select('pdf_share_token, pdf_share_enabled, pdf_url')
          .eq('id', send.report_id)
          .single();

        if (issueError || !issue) {
          setError('Report not found');
          return;
        }

        if (!issue.pdf_share_enabled || !issue.pdf_share_token) {
          setError('This report is no longer available');
          return;
        }

        // Redirect to the share page
        navigate(`/share/${issue.pdf_share_token}`, { replace: true });
      } catch (err) {
        console.error('Tracking error:', err);
        setError('An error occurred');
      }
    }

    trackAndRedirect();
  }, [trackingToken, navigate]);

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading report...</p>
      </div>
    </div>
  );
}
