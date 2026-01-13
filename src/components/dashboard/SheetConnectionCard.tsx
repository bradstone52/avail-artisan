import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { FileSpreadsheet, RefreshCw, Link2, Unlink, CheckCircle2, Shield } from 'lucide-react';
import { SheetConnection } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface SheetConnectionCardProps {
  connection: SheetConnection | null;
  onConnect: (url: string, name: string, tabName: string, connectionType?: 'csv' | 'oauth', googleSheetId?: string) => Promise<void>;
  onSync: () => Promise<unknown>;
  onDisconnect: () => Promise<void>;
  onConnectOAuth: () => Promise<void>;
  isSyncing: boolean;
  hasOAuthToken: boolean;
  isAdmin?: boolean;
}

export function SheetConnectionCard({
  connection,
  onConnect,
  onSync,
  onDisconnect,
  onConnectOAuth,
  isSyncing,
  hasOAuthToken,
  isAdmin = true,
}: SheetConnectionCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [tabName, setTabName] = useState('Sheet1');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionTab, setConnectionTab] = useState<'oauth' | 'csv'>('oauth');
  
  // OAuth-specific fields
  const [oauthSheetUrl, setOauthSheetUrl] = useState('');
  const [oauthSheetName, setOauthSheetName] = useState('');
  const [oauthTabName, setOauthTabName] = useState('Sheet1');

  const handleConnect = async () => {
    if (!sheetUrl.trim() || !sheetName.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsConnecting(true);
    try {
      await onConnect(sheetUrl.trim(), sheetName.trim(), tabName.trim() || 'Sheet1', 'csv');
      setDialogOpen(false);
      setSheetUrl('');
      setSheetName('');
      setTabName('Sheet1');
      toast.success('Sheet connected successfully!');
    } catch (error) {
      toast.error('Failed to connect sheet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleOAuthConnect = async () => {
    if (!hasOAuthToken) {
      // Start OAuth flow
      setIsConnecting(true);
      try {
        await onConnectOAuth();
      } catch (error) {
        toast.error('Failed to start OAuth flow');
      } finally {
        setIsConnecting(false);
      }
      return;
    }

    // User already has OAuth token, connect the sheet
    if (!oauthSheetUrl.trim() || !oauthSheetName.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Extract spreadsheet ID from URL
    const sheetId = extractSpreadsheetId(oauthSheetUrl);
    if (!sheetId) {
      toast.error('Invalid Google Sheets URL');
      return;
    }

    setIsConnecting(true);
    try {
      await onConnect(oauthSheetUrl.trim(), oauthSheetName.trim(), oauthTabName.trim() || 'Sheet1', 'oauth', sheetId);
      setDialogOpen(false);
      setOauthSheetUrl('');
      setOauthSheetName('');
      setOauthTabName('Sheet1');
      toast.success('Sheet connected via OAuth!');
    } catch (error) {
      toast.error('Failed to connect sheet');
    } finally {
      setIsConnecting(false);
    }
  };

  const extractSpreadsheetId = (url: string): string | null => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  if (!connection) {
    return (
      <div className="bg-card border border-dashed border-border rounded-xl p-6 animate-fade-in">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FileSpreadsheet className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-display font-semibold text-lg mb-1">Connect Your Data</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            Link a Google Sheet to import your distribution listings.
          </p>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Link2 className="w-4 h-4 mr-2" />
                Connect Google Sheet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Connect Google Sheet</DialogTitle>
                <DialogDescription>
                  Choose how to connect your Google Sheet
                </DialogDescription>
              </DialogHeader>
              
              <Tabs value={connectionTab} onValueChange={(v) => setConnectionTab(v as 'oauth' | 'csv')} className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="oauth" className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    OAuth (Secure)
                  </TabsTrigger>
                  <TabsTrigger value="csv">CSV URL</TabsTrigger>
                </TabsList>
                
                <TabsContent value="oauth" className="space-y-4 mt-4">
                  {!hasOAuthToken ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        Connect securely with your Google account. Your sheet doesn't need to be publicly published.
                      </p>
                      <Button 
                        onClick={handleOAuthConnect}
                        disabled={isConnecting}
                        className="w-full"
                      >
                        {isConnecting ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4 mr-2" />
                            Connect with Google
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-sm text-success mb-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Google account connected
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="oauth-sheet-name">Sheet Name *</Label>
                        <Input
                          id="oauth-sheet-name"
                          placeholder="Distribution Listings 2025"
                          value={oauthSheetName}
                          onChange={(e) => setOauthSheetName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="oauth-sheet-url">Google Sheets URL *</Label>
                        <Input
                          id="oauth-sheet-url"
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          value={oauthSheetUrl}
                          onChange={(e) => setOauthSheetUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Paste the full URL of your Google Sheet
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="oauth-tab-name">Tab Name</Label>
                        <Input
                          id="oauth-tab-name"
                          placeholder="Sheet1"
                          value={oauthTabName}
                          onChange={(e) => setOauthTabName(e.target.value)}
                        />
                      </div>
                      <Button 
                        onClick={handleOAuthConnect} 
                        className="w-full"
                        disabled={isConnecting}
                      >
                        {isConnecting ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          'Connect Sheet'
                        )}
                      </Button>
                    </>
                  )}
                </TabsContent>
                
                <TabsContent value="csv" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="sheet-name">Sheet Name *</Label>
                    <Input
                      id="sheet-name"
                      placeholder="Distribution Listings 2025"
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sheet-url">Published CSV URL *</Label>
                    <Input
                      id="sheet-url"
                      placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      In Google Sheets: File → Share → Publish to web → Select CSV
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tab-name">Tab Name</Label>
                    <Input
                      id="tab-name"
                      placeholder="Sheet1"
                      value={tabName}
                      onChange={(e) => setTabName(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleConnect} 
                    className="w-full"
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect Sheet'
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-sm">{connection.sheet_name}</h4>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                Tab: {connection.tab_name}
                {connection.connection_type === 'oauth' && (
                  <span className="inline-flex items-center gap-0.5 text-success">
                    <Shield className="w-3 h-3" /> OAuth
                  </span>
                )}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onDisconnect}
            >
              <Unlink className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-muted-foreground">
              {connection.last_synced_at 
                ? `Synced ${formatDistanceToNow(new Date(connection.last_synced_at), { addSuffix: true })}`
                : 'Never synced'}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
