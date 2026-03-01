import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMfa } from '@/hooks/useMfa';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, User, Mail, ShieldCheck, Tag } from 'lucide-react';
import {
  getOverdueTemplate,
  setOverdueTemplate,
  resetOverdueTemplate,
  isValidOverdueTemplate,
  DEFAULT_OVERDUE_TEMPLATE,
} from '@/lib/prefs';

export default function AccountSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isEnabled: mfaEnabled, loading: mfaLoading } = useMfa();

  // ── Overdue label preference ──────────────────────────────────────────────
  const [savedTemplate, setSavedTemplate] = useState(() => getOverdueTemplate());
  const [templateDraft, setTemplateDraft] = useState(() => getOverdueTemplate());

  const isTemplateValid = isValidOverdueTemplate(templateDraft);
  const isDirty = templateDraft !== savedTemplate;

  const handleSaveTemplate = () => {
    if (!isTemplateValid) return;
    setOverdueTemplate(templateDraft);
    setSavedTemplate(templateDraft);
  };

  const handleResetTemplate = () => {
    resetOverdueTemplate();
    setTemplateDraft(DEFAULT_OVERDUE_TEMPLATE);
    setSavedTemplate(DEFAULT_OVERDUE_TEMPLATE);
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Account Settings</h1>
            <p className="text-muted-foreground">Manage your account and security preferences</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MFA Settings Card */}
          {mfaLoading ? (
            <Card>
              <CardContent className="py-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                  Two-factor authentication is mandatory for all users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    2FA is enabled and required
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Display Preferences Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Display Preferences
              </CardTitle>
              <CardDescription>
                Customize how labels appear across the app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="overdue-template">Overdue label template</Label>
                <Input
                  id="overdue-template"
                  value={templateDraft}
                  onChange={(e) => setTemplateDraft(e.target.value)}
                  placeholder={DEFAULT_OVERDUE_TEMPLATE}
                  maxLength={80}
                  className={!isTemplateValid && templateDraft.length > 0 ? 'border-destructive' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded text-xs">{'{days}'}</code> as the
                  placeholder, e.g. <em>Overdue by {'{days}'} days</em> or <em>Overdue: {'{days}'}d</em>
                </p>
                {!isTemplateValid && templateDraft.length > 0 && (
                  <p className="text-xs text-destructive">
                    Template must include <code>{'{days}'}</code> and be 1–80 characters.
                  </p>
                )}
                {savedTemplate !== DEFAULT_OVERDUE_TEMPLATE && (
                  <p className="text-xs text-muted-foreground">
                    Preview: <strong>{savedTemplate.replace('{days}', '3')}</strong>
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveTemplate}
                  disabled={!isTemplateValid || !isDirty}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetTemplate}
                  disabled={savedTemplate === DEFAULT_OVERDUE_TEMPLATE && templateDraft === DEFAULT_OVERDUE_TEMPLATE}
                >
                  Reset to default
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
