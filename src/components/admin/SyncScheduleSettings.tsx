import { useState } from 'react';
import { useSyncSettings, SyncLog } from '@/hooks/useSyncSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Clock, Calendar, AlertTriangle, CheckCircle2, XCircle, Loader2, User, Bot } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export function SyncScheduleSettings() {
  const { settings, logs, loading, updateSettings, getNextScheduledRun } = useSyncSettings();
  const { isAdmin } = useUserRole();
  const [morningTime, setMorningTime] = useState(settings?.morning_sync_time || '07:00');
  const [eveningTime, setEveningTime] = useState(settings?.evening_sync_time || '18:00');
  const [minSF, setMinSF] = useState(settings?.size_threshold_min?.toString() || '100000');
  const [maxSF, setMaxSF] = useState(settings?.size_threshold_max?.toString() || '500000');

  if (loading || !settings) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const nextRun = getNextScheduledRun();

  const handleTimeChange = async (type: 'morning' | 'evening', value: string) => {
    if (type === 'morning') {
      setMorningTime(value);
      await updateSettings({ morning_sync_time: value });
    } else {
      setEveningTime(value);
      await updateSettings({ evening_sync_time: value });
    }
  };

  const handleSizeChange = async (type: 'min' | 'max', value: string) => {
    const numValue = parseInt(value.replace(/,/g, ''), 10);
    if (isNaN(numValue)) return;
    
    if (type === 'min') {
      setMinSF(value);
      await updateSettings({ size_threshold_min: numValue });
    } else {
      setMaxSF(value);
      await updateSettings({ size_threshold_max: numValue });
    }
  };

  const getStatusBadge = (log: SyncLog) => {
    switch (log.status) {
      case 'running':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      case 'success':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Credentials Expired Warning */}
      {settings.google_credentials_expired && isAdmin && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Google Connection Expired</p>
              <p className="text-sm text-muted-foreground">
                Scheduled sync is paused. Reconnect your Google account to resume.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Scheduled Sync
          </CardTitle>
          <CardDescription>
            Automatically sync data from Google Sheets twice daily
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="scheduled-sync">Enable Scheduled Sync</Label>
              <p className="text-sm text-muted-foreground">
                Automatically refresh listings at scheduled times
              </p>
            </div>
            <Switch
              id="scheduled-sync"
              checked={settings.scheduled_sync_enabled}
              onCheckedChange={(checked) => updateSettings({ scheduled_sync_enabled: checked })}
              disabled={!isAdmin}
            />
          </div>

          {settings.scheduled_sync_enabled && (
            <>
              {/* Schedule Times */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="morning-time">Morning Sync</Label>
                  <Input
                    id="morning-time"
                    type="time"
                    value={morningTime}
                    onChange={(e) => handleTimeChange('morning', e.target.value)}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="evening-time">Evening Sync</Label>
                  <Input
                    id="evening-time"
                    type="time"
                    value={eveningTime}
                    onChange={(e) => handleTimeChange('evening', e.target.value)}
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              {/* Size Thresholds */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min-sf">Min Size (SF)</Label>
                  <Input
                    id="min-sf"
                    type="number"
                    value={minSF}
                    onChange={(e) => handleSizeChange('min', e.target.value)}
                    disabled={!isAdmin}
                    placeholder="100000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-sf">Max Size (SF)</Label>
                  <Input
                    id="max-sf"
                    type="number"
                    value={maxSF}
                    onChange={(e) => handleSizeChange('max', e.target.value)}
                    disabled={!isAdmin}
                    placeholder="500000"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Only listings with Total SF between {Number(minSF).toLocaleString()} and {Number(maxSF).toLocaleString()} will be imported.
              </p>

              <p className="text-sm text-muted-foreground">
                Timezone: {settings.timezone}
              </p>

              {/* Next Run */}
              {nextRun && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Next scheduled run:</span>
                  <span className="font-medium">
                    {format(nextRun, 'MMM d, yyyy')} at {format(nextRun, 'h:mm a')}
                  </span>
                  <span className="text-muted-foreground">
                    ({formatDistanceToNow(nextRun, { addSuffix: true })})
                  </span>
                </div>
              )}
            </>
          )}

          {/* Last Run Status */}
          {settings.last_scheduled_run_at && (
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-1">Last scheduled run:</p>
              <p className="text-sm">
                {format(new Date(settings.last_scheduled_run_at), 'MMM d, yyyy h:mm a')}
                {' — '}
                <span className={settings.last_scheduled_run_status?.includes('failed') ? 'text-destructive' : 'text-green-600'}>
                  {settings.last_scheduled_run_status}
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
          <CardDescription>
            Recent sync runs (manual and scheduled)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No sync runs yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Imported</TableHead>
                  <TableHead>Skipped</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.started_at), 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {log.run_type === 'manual' ? (
                          <>
                            <User className="w-3 h-3 mr-1" />
                            Manual
                          </>
                        ) : (
                          <>
                            <Bot className="w-3 h-3 mr-1" />
                            Scheduled
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(log)}</TableCell>
                    <TableCell className="text-sm">{log.rows_imported}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.rows_skipped}
                      {log.error_message && (
                        <span className="block text-xs text-destructive truncate max-w-[200px]" title={log.error_message}>
                          {log.error_message}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
