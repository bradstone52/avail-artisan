import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';

export function NotificationsTab() {
  const { settings, isLoading, updateSettings, isUpdating } = useNotificationSettings();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Configure how you receive notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-notifications">Email Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications via email
            </p>
          </div>
          <Switch
            id="email-notifications"
            checked={settings.email_notifications}
            onCheckedChange={(checked) => updateSettings({ email_notifications: checked })}
            disabled={isUpdating}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="deal-reminders">Deal Reminders</Label>
            <p className="text-sm text-muted-foreground">
              Get reminded about upcoming deal dates
            </p>
          </div>
          <Switch
            id="deal-reminders"
            checked={settings.deal_reminders}
            onCheckedChange={(checked) => updateSettings({ deal_reminders: checked })}
            disabled={isUpdating}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="prospect-follow-ups">Prospect Follow-ups</Label>
            <p className="text-sm text-muted-foreground">
              Reminders for prospect follow-up dates
            </p>
          </div>
          <Switch
            id="prospect-follow-ups"
            checked={settings.prospect_follow_ups}
            onCheckedChange={(checked) => updateSettings({ prospect_follow_ups: checked })}
            disabled={isUpdating}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="daily-digest">Daily Digest</Label>
            <p className="text-sm text-muted-foreground">
              Receive a daily summary of activities
            </p>
          </div>
          <Switch
            id="daily-digest"
            checked={settings.daily_digest}
            onCheckedChange={(checked) => updateSettings({ daily_digest: checked })}
            disabled={isUpdating}
          />
        </div>
      </CardContent>
    </Card>
  );
}
