import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Link2, Unlink, Settings, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface OrgIntegrationCardProps {
  integration: {
    sheet_url: string | null;
    sheet_id: string | null;
    tab_name: string | null;
    header_row: number | null;
    last_synced_at: string | null;
  } | null;
  hasGoogleConnection: boolean;
  hasSheetConfigured: boolean;
  isAdmin: boolean;
  isSyncing: boolean;
  onConnectGoogle: () => void;
  onDisconnectGoogle: () => void;
  onUpdateSettings: (sheetUrl: string, tabName: string, headerRow: number) => void;
  onSync: () => void;
}

export function OrgIntegrationCard({
  integration,
  hasGoogleConnection,
  hasSheetConfigured,
  isAdmin,
  isSyncing,
  onConnectGoogle,
  onDisconnectGoogle,
  onUpdateSettings,
  onSync,
}: OrgIntegrationCardProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [sheetUrl, setSheetUrl] = useState(integration?.sheet_url || '');
  const [tabName, setTabName] = useState(integration?.tab_name || 'Vacancy_List');
  const [headerRow, setHeaderRow] = useState(integration?.header_row || 2);

  const handleSaveSettings = () => {
    onUpdateSettings(sheetUrl, tabName, headerRow);
    setShowSettings(false);
  };

  // Not connected state
  if (!hasGoogleConnection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Google Sheets Not Connected
          </CardTitle>
          <CardDescription>
            {isAdmin 
              ? 'Connect Google Sheets to sync property listings for your team.'
              : 'An admin must connect Google Sheets before syncing.'}
          </CardDescription>
        </CardHeader>
        {isAdmin && (
          <CardContent>
            <Button onClick={onConnectGoogle} className="w-full">
              <Link2 className="w-4 h-4 mr-2" />
              Connect Google Account
            </Button>
          </CardContent>
        )}
      </Card>
    );
  }

  // Connected but no sheet configured
  if (!hasSheetConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Google Connected
          </CardTitle>
          <CardDescription>
            {isAdmin 
              ? 'Configure which Google Sheet to sync from.'
              : 'An admin must configure the sheet settings.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="sheetUrl">Google Sheet URL</Label>
                <Input
                  id="sheetUrl"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="tabName">Tab Name</Label>
                  <Input
                    id="tabName"
                    placeholder="Vacancy_List"
                    value={tabName}
                    onChange={(e) => setTabName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="headerRow">Header Row</Label>
                  <Input
                    id="headerRow"
                    type="number"
                    min={1}
                    value={headerRow}
                    onChange={(e) => setHeaderRow(parseInt(e.target.value) || 2)}
                  />
                </div>
              </div>
              <Button onClick={handleSaveSettings} className="w-full">
                Save & Continue
              </Button>
              <Button variant="ghost" size="sm" onClick={onDisconnectGoogle} className="w-full text-destructive">
                <Unlink className="w-4 h-4 mr-2" />
                Disconnect Google
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Fully configured
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Google Sheets Connected
            </CardTitle>
            <CardDescription>
              {integration?.last_synced_at 
                ? `Last synced: ${new Date(integration.last_synced_at).toLocaleString()}`
                : 'Never synced'}
            </CardDescription>
          </div>
          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSettings && isAdmin && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="sheetUrlEdit">Google Sheet URL</Label>
              <Input
                id="sheetUrlEdit"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tabNameEdit">Tab Name</Label>
                <Input
                  id="tabNameEdit"
                  value={tabName}
                  onChange={(e) => setTabName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="headerRowEdit">Header Row</Label>
                <Input
                  id="headerRowEdit"
                  type="number"
                  min={1}
                  value={headerRow}
                  onChange={(e) => setHeaderRow(parseInt(e.target.value) || 2)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveSettings}>
                Save Settings
              </Button>
              <Button variant="ghost" size="sm" onClick={onDisconnectGoogle} className="text-destructive">
                <Unlink className="w-4 h-4 mr-1" />
                Disconnect
              </Button>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p><strong>Tab:</strong> {integration?.tab_name || 'Vacancy_List'}</p>
          <p><strong>Header Row:</strong> {integration?.header_row || 2}</p>
        </div>

        <Button 
          onClick={onSync} 
          disabled={isSyncing}
          className="w-full"
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync Listings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
