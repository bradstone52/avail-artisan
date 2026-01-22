import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ExternalLink, Search, Sparkles, Check, X, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MarketListing } from '@/hooks/useMarketListings';

interface FixLinksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: MarketListing[];
  onListingUpdated: () => void;
}

type ListingWithIssue = MarketListing & {
  issue: 'missing' | 'broken';
};

export function FixLinksDialog({ open, onOpenChange, listings, onListingUpdated }: FixLinksDialogProps) {
  const [activeTab, setActiveTab] = useState<'missing' | 'broken'>('broken');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [autoFindingId, setAutoFindingId] = useState<string | null>(null);

  const brokenListings = useMemo(() => 
    listings.filter(l => l.link && l.link !== '' && l.link_status === 'broken'),
    [listings]
  );

  const missingListings = useMemo(() => 
    listings.filter(l => !l.link || l.link === ''),
    [listings]
  );

  const buildGoogleSearchUrl = (listing: MarketListing) => {
    const address = listing.display_address || listing.address;
    const broker = listing.broker_source || '';
    const query = `${address} ${broker} industrial brochure PDF`;
    
    // Add site filters for known brokers
    const siteFilters = [
      'site:cbre.com',
      'site:colliers.com', 
      'site:jll.com',
      'site:cushwake.com',
      'site:avisonyoung.com',
    ].join(' OR ');
    
    const fullQuery = `${query} (${siteFilters})`;
    return `https://www.google.com/search?q=${encodeURIComponent(fullQuery)}`;
  };

  const openExternalUrl = (url: string) => {
    const isFirefox = typeof navigator !== 'undefined' && /Firefox\//.test(navigator.userAgent);

    const copyToClipboardFallback = async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast.info('Google search URL copied to clipboard — paste it into a new tab.');
      } catch {
        toast.info('Popup blocked / browser policy prevented opening. Please copy/paste the URL manually.');
      }
    };

    // Firefox can block cross-origin navigations from COOP-protected contexts with a “security configuration doesn't match” error.
    // Most reliable workaround: open a neutral intermediary document (Blob URL) in a new tab which then redirects.
    if (isFirefox) {
      try {
        const safeUrl = JSON.stringify(url);
        const html = `<!doctype html><meta charset="utf-8" />
<meta http-equiv="refresh" content="0;url=${encodeURI(url)}" />
<title>Redirecting…</title>
<script>try{window.opener=null;}catch(e){};location.replace(${safeUrl});</script>`;

        const blob = new Blob([html], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        const w = window.open(blobUrl, '_blank', 'noopener,noreferrer');
        // Release the Blob URL shortly after to avoid leaking object URLs.
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);

        if (!w) void copyToClipboardFallback();
        return;
      } catch {
        void copyToClipboardFallback();
        return;
      }
    }

    // Non-Firefox: anchor click is the simplest + most compatible.
    try {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.referrerPolicy = 'no-referrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      const w = window.open(url, '_blank', 'noopener,noreferrer');
      if (!w) void copyToClipboardFallback();
    }
  };

  const handleSaveLink = async (listingId: string) => {
    if (!editingLink.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(editingLink);
    } catch {
      toast.error('Please enter a valid URL (must start with http:// or https://)');
      return;
    }

    setSavingId(listingId);
    try {
      const { error } = await supabase
        .from('market_listings')
        .update({ 
          link: editingLink.trim(),
          link_status: null, // Reset status so it gets re-checked
          link_last_checked: null,
        })
        .eq('id', listingId);

      if (error) throw error;
      
      toast.success('Link saved');
      setEditingId(null);
      setEditingLink('');
      onListingUpdated();
    } catch (err) {
      console.error('Error saving link:', err);
      toast.error('Failed to save link');
    } finally {
      setSavingId(null);
    }
  };

  const handleAutoFind = async (listing: MarketListing) => {
    setAutoFindingId(listing.id);
    try {
      const { data, error } = await supabase.functions.invoke('find-brochure', {
        body: { 
          listingId: listing.id,
          address: listing.display_address || listing.address,
          city: listing.city,
          broker: listing.broker_source,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.success && data?.link) {
        toast.success('Brochure found and saved!');
        onListingUpdated();
      } else {
        toast.info(data?.message || 'No brochure found. Try manual search.');
      }
    } catch (err) {
      console.error('Auto-find error:', err);
      toast.error(err instanceof Error ? err.message : 'Auto-find failed');
    } finally {
      setAutoFindingId(null);
    }
  };

  const startEditing = (listing: MarketListing) => {
    setEditingId(listing.id);
    setEditingLink(listing.link || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingLink('');
  };

  const renderListingRow = (listing: ListingWithIssue) => {
    const isEditing = editingId === listing.id;
    const isSaving = savingId === listing.id;
    const isAutoFinding = autoFindingId === listing.id;

    return (
      <div
        key={listing.id}
        className="flex items-start gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">
              {listing.display_address || listing.address}
            </span>
            <Badge variant={listing.issue === 'broken' ? 'destructive' : 'secondary'} className="text-xs shrink-0">
              {listing.issue === 'broken' ? 'Broken' : 'Missing'}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            {listing.submarket} • {listing.size_sf?.toLocaleString()} SF
            {listing.broker_source && ` • ${listing.broker_source}`}
          </div>
          
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editingLink}
                onChange={(e) => setEditingLink(e.target.value)}
                placeholder="https://..."
                className="h-8 text-xs flex-1"
                disabled={isSaving}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSaveLink(listing.id)}
                disabled={isSaving}
                className="h-8 w-8 p-0"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelEditing}
                disabled={isSaving}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Use a true <a> tag (but keep Button styling) to avoid Firefox COOP issues inside iframes */}
              <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                <a href={buildGoogleSearchUrl(listing)} target="_blank" rel="noopener noreferrer">
                  <Search className="w-3 h-3" />
                  Google Search
                  <ExternalLink className="w-3 h-3" />
                </a>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAutoFind(listing)}
                disabled={isAutoFinding}
                className="h-7 text-xs"
              >
                {isAutoFinding ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 mr-1" />
                )}
                Auto-Find
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => startEditing(listing)}
                className="h-7 text-xs"
              >
                Enter Link
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Fix Broken & Missing Links
          </DialogTitle>
          <DialogDescription>
            {brokenListings.length} broken links, {missingListings.length} missing links
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'missing' | 'broken')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="broken" className="text-sm">
              Broken ({brokenListings.length})
            </TabsTrigger>
            <TabsTrigger value="missing" className="text-sm">
              Missing ({missingListings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="broken" className="mt-4">
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-2">
                {brokenListings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No broken links found
                  </div>
                ) : (
                  brokenListings.map((l) => 
                    renderListingRow({ ...l, issue: 'broken' as const })
                  )
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="missing" className="mt-4">
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-2">
                {missingListings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    All listings have links
                  </div>
                ) : (
                  missingListings.map((l) => 
                    renderListingRow({ ...l, issue: 'missing' as const })
                  )
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 inline mr-1" />
            Auto-Find uses AI to search and verify brochures
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
