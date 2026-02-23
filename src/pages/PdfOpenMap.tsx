import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function PdfOpenMap() {
  const query = useQuery();
  const token = query.get("token");

  const [error, setError] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing map token");
      return;
    }

    // Build the public map URL — this route requires no authentication
    const url = `/public/distribution-map?token=${encodeURIComponent(token)}`;
    setTargetUrl(url);

    // Many PDF viewers ignore target=_blank. Try to open a new tab first.
    const opened = window.open(url, "_blank", "noopener,noreferrer");

    if (!opened) {
      // Popup blocked → navigate this tab directly to the public map
      window.location.replace(url);
      return;
    }
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <meta name="robots" content="noindex, nofollow" />
        <div className="max-w-md w-full">
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-display font-semibold mb-2">Link Not Available</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <p className="text-xs text-muted-foreground">If you believe this is an error, please request a new link.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <meta name="robots" content="noindex, nofollow" />
      <div className="max-w-md w-full">
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <h1 className="text-lg font-display font-semibold mb-2">Opening interactive map…</h1>
          <p className="text-muted-foreground mb-6">
            If it didn't open automatically, use the button below.
          </p>
          <Button asChild className="w-full" disabled={!targetUrl}>
            <a href={targetUrl ?? "#"} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Interactive Map
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
