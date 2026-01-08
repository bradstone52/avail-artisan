import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { FileSpreadsheet, RefreshCw, Link2, Unlink, CheckCircle2, AlertCircle } from 'lucide-react';
import { SheetConnection } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  onConnect: (url: string, name: string, tabName: string) => Promise<void>;
  onSync: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  isSyncing: boolean;
}

export function SheetConnectionCard({
  connection,
  onConnect,
  onSync,
  onDisconnect,
  isSyncing,
}: SheetConnectionCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [tabName, setTabName] = useState('Sheet1');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!sheetUrl.trim() || !sheetName.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsConnecting(true);
    try {
      await onConnect(sheetUrl.trim(), sheetName.trim(), tabName.trim() || 'Sheet1');
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

  if (!connection) {
    return (
      <div className="bg-card border border-dashed border-border rounded-xl p-6 animate-fade-in">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FileSpreadsheet className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="font-display font-semibold text-lg mb-1">Connect Your Data</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            Link a Google Sheet to import your distribution listings. The sheet must follow the required format.
          </p>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Link2 className="w-4 h-4 mr-2" />
                Connect Google Sheet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect Google Sheet</DialogTitle>
                <DialogDescription>
                  Enter the URL of your published Google Sheet. Make sure the sheet is published to the web as CSV.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
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
              </div>
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
              <p className="text-xs text-muted-foreground mt-0.5">
                Tab: {connection.tab_name}
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
